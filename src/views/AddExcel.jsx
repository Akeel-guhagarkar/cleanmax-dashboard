import React, { useRef, useState } from 'react';
import ExcelJS from 'exceljs';
import { useProcure } from '../context/ProcureContext';
import { calculateStatus } from '../utils/seedData';
import { Upload, FileText, CheckCircle, AlertCircle, Trash2, Edit2, Save, X, Clock, User, Shield } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { sendNotification } from '../utils/notify';

const format12HourDateTime = (timestamp) => {
  if (!timestamp) return 'N/A';
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

const AddExcel = () => {
  const { state, dispatch, showToast } = useProcure();
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [previewSearchTerm, setPreviewSearchTerm] = useState('');
  const [previewPage, setPreviewPage] = useState(1);
  const previewPageSize = 25;
  const [editingRowId, setEditingRowId] = useState(null);
  const [editFormData, setEditFormData] = useState(null);
  const [currentFileName, setCurrentFileName] = useState('');

  const filteredPreviewData = React.useMemo(() => {
    if (!previewData) return [];
    if (!previewSearchTerm.trim()) return previewData;
    const term = previewSearchTerm.toLowerCase().trim();
    return previewData.filter(row => 
      (row.vendorName && row.vendorName.toLowerCase().includes(term)) ||
      (row.plantName && row.plantName.toLowerCase().includes(term)) ||
      (row.vendorCode && row.vendorCode.toLowerCase().includes(term)) ||
      (row.region && row.region.toLowerCase().includes(term)) ||
      (row.city && row.city.toLowerCase().includes(term))
    );
  }, [previewData, previewSearchTerm]);

  const paginatedPreviewData = React.useMemo(() => {
    const start = (previewPage - 1) * previewPageSize;
    return filteredPreviewData.slice(start, start + previewPageSize);
  }, [filteredPreviewData, previewPage, previewPageSize]);

  const processExcel = async (file) => {
    setIsProcessing(true);
    setCurrentFileName(file.name);
    setResults(null);
    setPreviewData(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new Error("No worksheet found in the Excel file.");
      }

      const parsedRows = [];
      let errors = 0;
      
      const headerMap = {};

      worksheet.eachRow((row, rowNumber) => {
        const getValRaw = (r, col) => {
          const cell = r.getCell(col);
          const val = cell.value;
          if (val === null || val === undefined) return '';
          if (typeof val === 'object') {
            if (val.richText) return val.richText.map(rt => rt.text).join('');
            if (val.result !== undefined) return val.result;
            if (val instanceof Date) return val; 
          }
          return val.toString();
        };

        if (rowNumber === 1) {
           row.eachCell((cell, colNumber) => {
              const val = getValRaw(row, colNumber).toString().toLowerCase().replace(/[^a-z0-9]/g, '');
              if (val) headerMap[val] = colNumber;
           });
           return;
        }
        
        try {
          const getMappedValInfo = (keys, defaultCol) => {
             for (const key of keys) {
               if (headerMap[key]) return { val: getValRaw(row, headerMap[key]), matchedKey: key };
             }
             return { val: getValRaw(row, defaultCol), matchedKey: '' };
          };

          const getMappedVal = (keys, defaultCol) => getMappedValInfo(keys, defaultCol).val;
          
          let vendorCode = getMappedVal(['vendorcode', 'code'], 1).toString().trim();
          let vendorName = getMappedVal(['vendorname', 'name', 'vendor'], 2).toString().trim();
          const VALID_ENTITIES = ['CMES', 'COGEN', 'JUPITER', 'POWER 1'];
          let entityRaw = getMappedVal(['entity', 'cmesentity', 'cmes', 'company', 'cmescompany'], 3).toString().trim().toUpperCase();
          let cmesEntity = VALID_ENTITIES.includes(entityRaw) ? entityRaw : 'CMES';
          let plantName = getMappedVal(['plantname', 'plant', 'project', 'projectname'], 4).toString().trim();
          
          if (!vendorName || !plantName) {
             return;
          }

          let capacityInfo = getMappedValInfo(['capacity', 'size', 'plantcapacity', 'capacitykwp', 'capacitymwp', 'capacitykw', 'capacitymw', 'kwp', 'mwp'], 5);
          let capacityStr = capacityInfo.val.toString().trim();
          let capacity = parseFloat(capacityStr) || 0;
          let capacityUnit = 'kWp'; // Always default to kWp
          
          if (capacityInfo.matchedKey.includes('mw') || capacityStr.toLowerCase().includes('mwp')) {
            capacityUnit = 'MWp'; // Only use MWp if explicitly stated
          }

          let region = getMappedVal(['region', 'zone'], 6).toString().trim();
          let stateVal = getMappedVal(['state', 'statename'], 7).toString().trim();
          let city = getMappedVal(['city', 'location', 'cityname'], 8).toString().trim();
          let rateStr = getMappedVal(['rate', 'price', 'cost'], 9).toString().trim();
          let rate = parseFloat(rateStr) || 0;
          let poNumber = getMappedVal(['ponumber', 'po', 'order', 'pono'], 9).toString().trim();
          
          let startDate = getMappedVal(['startdate', 'start', 'contractstart', 'startingdate'], 11);
          let endDate = getMappedVal(['enddate', 'end', 'contractend', 'endingdate'], 12);
          
          const formatDate = (dateVal) => {
            if (!dateVal) return new Date().toISOString().split('T')[0];
            try {
              const d = new Date(dateVal);
              if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
            } catch (e) {}
            return new Date().toISOString().split('T')[0];
          };

          let status = getMappedVal(['status', 'state'], 13).toString().trim();
          
          if (!vendorCode) {
             vendorCode = `VND-${Math.floor(1000 + Math.random() * 9000)}`;
          }

          parsedRows.push({
            id: uuidv4(),
            vendorCode,
            vendorName,
            cmesEntity,
            plantName,
            capacity,
            capacityUnit,
            region,
            state: stateVal,
            city,
            rate,
            poNumber,
            contractStart: formatDate(startDate),
            contractEnd: formatDate(endDate),
            status
          });
        } catch (e) {
          console.error("Error parsing row:", rowNumber, e);
          errors++;
        }
      });
      
      if (parsedRows.length > 0) {
        setPreviewData(parsedRows);
        if (errors > 0) {
           showToast(`Found ${parsedRows.length} valid rows, but ${errors} rows had errors.`, 'warning');
        }
      } else {
        showToast(`No valid records found to process.`, 'warning');
      }
      
    } catch (error) {
      console.error("Failed to parse Excel:", error);
      showToast("Failed to parse Excel file. Make sure it is a valid .xlsx file.", 'error');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImport = () => {
    if (!previewData || previewData.length === 0) return;
    
    let addedCount = 0;
    let existingVendorCount = 0;
    let newVendorCount = 0;
    
    // Map to keep track of vendors we've already identified in this upload
    const vendorMap = new Map();
    state.vendors.forEach(v => {
      if (v.vendorCode) vendorMap.set(v.vendorCode.toLowerCase().trim(), v);
      if (v.vendorName) vendorMap.set(v.vendorName.toLowerCase().trim(), v);
    });

    const addedVendorIds = [];
    const addedProjectIds = [];
    
    const batchVendors = [];
    const batchProjects = [];

    previewData.forEach(row => {
      let vendorToUse = null;
      if (row.vendorCode) vendorToUse = vendorMap.get(row.vendorCode.toLowerCase().trim());
      if (!vendorToUse && row.vendorName) vendorToUse = vendorMap.get(row.vendorName.toLowerCase().trim());

      let vendorId = uuidv4();
      
      if (vendorToUse) {
        existingVendorCount++;
        row.vendorCode = vendorToUse.vendorCode;
        row.vendorName = vendorToUse.vendorName;
      } else {
        newVendorCount++;
      }

      addedVendorIds.push(vendorId);

      const vendorPayload = {
        id: vendorId,
        vendorCode: row.vendorCode,
        vendorName: row.vendorName,
        vendorType: 'Manufacturer',
        cmesEntity: row.cmesEntity || 'CMES',
        plantName: row.plantName,
        plantCapacity: row.capacity,
        capacityUnit: row.capacityUnit,
        rate: row.rate,
        poNumber: row.poNumber,
        region: row.region,
        state: row.state,
        city: row.city,
        contractStart: row.contractStart,
        contractEnd: row.contractEnd,
        status: row.status || calculateStatus(row.contractEnd),
        originalStatus: row.status,
        createdAt: new Date().toISOString()
      };
      batchVendors.push(vendorPayload);
      
      if (!vendorToUse) {
        if (row.vendorCode) vendorMap.set(row.vendorCode.toLowerCase().trim(), vendorPayload);
        if (row.vendorName) vendorMap.set(row.vendorName.toLowerCase().trim(), vendorPayload);
      }

      const projectId = uuidv4();
      addedProjectIds.push(projectId);

      const projectPayload = {
        id: projectId,
        projectCode: `PRJ-${new Date(row.contractStart).getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        projectName: row.plantName,
        client: row.vendorName,
        type: 'O&M Project',
        capacity: row.capacity,
        unit: row.capacityUnit,
        status: (row.status || calculateStatus(row.contractEnd)) === 'Active' ? 'In Progress' : 'Completed',
        completionDate: row.contractStart,
      };
      batchProjects.push(projectPayload);

      addedCount++;
    });

    dispatch({ type: 'IMPORT_EXCEL', payload: { vendors: batchVendors, projects: batchProjects } });
    
    dispatch({
      type: 'ADD_UPLOAD_HISTORY',
      payload: {
        id: uuidv4(),
        fileName: currentFileName || 'Unknown File',
        recordsCount: addedCount,
        vendorIds: addedVendorIds,
        projectIds: addedProjectIds,
        uploadedBy: state.currentUser?.name || 'Admin User',
        uploadedByRole: state.currentUser?.role || 'Admin',
        timestamp: new Date().toISOString(),
      }
    });

    sendNotification(dispatch, {
      title: 'ðŸ“Š Excel Import Complete',
      message: `${addedCount} vendor record(s) imported from "${currentFileName || 'Excel file'}" (${newVendorCount} new vendors, ${existingVendorCount} updated)`,
      type: 'success',
      targetRoles: ['admin'],
      actor: state.currentUser?.name,
      actorRole: state.currentUser?.role,
      skipForAdmin: false,
    });

    setResults({
      added: addedCount,
      existingVendors: existingVendorCount,
      newVendors: newVendorCount,
      errors: 0,
      addedVendorIds,
      addedProjectIds
    });
    setPreviewData(null);
    showToast(`Successfully imported ${addedCount} records.`, 'success');
  };

  const handleUndoImport = () => {
    if (results && results.addedVendorIds && results.addedProjectIds) {
      if (results.addedVendorIds.length > 0) {
        dispatch({ type: 'DELETE_VENDORS', payload: results.addedVendorIds });
      }
      if (results.addedProjectIds.length > 0) {
        dispatch({ type: 'DELETE_PROJECTS', payload: results.addedProjectIds });
      }
      showToast('Import undone. All records from that upload have been removed.', 'success');
      setResults(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processExcel(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processExcel(e.target.files[0]);
    }
  };
  
  const handleDeleteRow = (id) => {
    setPreviewData(prev => prev.filter(r => r.id !== id));
  };

  const startEditing = (row) => {
    setEditingRowId(row.id);
    setEditFormData({ ...row });
  };

  const saveEdit = () => {
    setPreviewData(prev => prev.map(r => r.id === editingRowId ? editFormData : r));
    setEditingRowId(null);
    setEditFormData(null);
  };

  const cancelEdit = () => {
    setEditingRowId(null);
    setEditFormData(null);
  };

  const handleEditChange = (e, field) => {
    setEditFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <div className="animate-fade-in-up" style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Add Vendors via Excel</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Upload your Excel sheet to bulk import vendors and projects.</p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          Expected Columns: <strong>Vendor Code, Vendor Name, Entity, Plant Name, Capacity, Region, State, City, Rate, PO No, Starting Date, Ending Date, Status</strong>
        </p>
      </div>

      {!previewData && (
        <div 
          className="glass-panel" 
          style={{ 
            padding: '4rem 2rem', 
            textAlign: 'center', 
            border: `2px dashed ${isDragging ? 'var(--accent-color)' : 'var(--border-color)'}`, 
            borderRadius: 'var(--radius-lg)',
            backgroundColor: isDragging ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            {isProcessing ? (
              <div className="animate-spin" style={{ color: 'var(--accent-color)' }}>
                <Upload size={48} />
              </div>
            ) : (
              <FileText size={48} style={{ color: isDragging ? 'var(--accent-color)' : 'var(--text-secondary)' }} />
            )}
            
            <div>
              <p style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                {isProcessing ? 'Processing...' : 'Drag and drop your Excel file here'}
              </p>
              {!isProcessing && (
                <p style={{ color: 'var(--text-secondary)' }}>or click to browse your files</p>
              )}
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".xlsx, .xls, .csv" 
              style={{ display: 'none' }} 
            />
            
            {!isProcessing && (
              <button 
                className="btn-premium" 
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                style={{ marginTop: '1rem' }}
              >
                Browse Files
              </button>
            )}
          </div>
        </div>
      )}

      {previewData && (
        <div className="glass-panel animate-fade-in-up" style={{ marginTop: '2rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
             <div>
               <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                 Preview Data ({previewData.length} records)
               </h3>
               <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                 Review and edit records before confirming the import.
               </p>
             </div>

             <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
               <input
                 type="text"
                 placeholder="Search in preview..."
                 className="premium-input"
                 style={{ padding: '0.35rem 0.75rem', fontSize: '0.875rem', width: '200px' }}
                 value={previewSearchTerm}
                 onChange={(e) => { setPreviewSearchTerm(e.target.value); setPreviewPage(1); }}
               />
               <button className="btn-ghost" onClick={() => { setPreviewData(null); setPreviewSearchTerm(''); }}>Cancel</button>
               <button className="btn-premium" onClick={handleImport}>Confirm & Import ({previewData.length})</button>
             </div>
          </div>
          
          <div className="table-container" style={{ maxHeight: '500px', overflowY: 'auto' }}>
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Vendor Name</th>
                  <th>Entity</th>
                  <th>Plant Name</th>
                  <th>Capacity</th>
                  <th>Region</th>
                  <th>State</th>
                  <th>City</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPreviewData.map(row => (
                  <tr key={row.id}>
                    {editingRowId === row.id ? (
                      <>
                        <td>
                          <input className="premium-input" style={{ padding: '0.25rem 0.5rem', width: '100%' }} value={editFormData.vendorName} onChange={(e) => handleEditChange(e, 'vendorName')} />
                        </td>
                        <td>
                          <select className="premium-input" style={{ padding: '0.25rem 0.5rem', width: '110px' }} value={editFormData.cmesEntity || 'CMES'} onChange={(e) => handleEditChange(e, 'cmesEntity')}>
                            {['CMES', 'COGEN', 'JUPITER', 'POWER 1'].map(e => <option key={e} value={e}>{e}</option>)}
                          </select>
                        </td>
                        <td>
                          <input className="premium-input" style={{ padding: '0.25rem 0.5rem', width: '100%' }} value={editFormData.plantName} onChange={(e) => handleEditChange(e, 'plantName')} />
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                             <input type="number" className="premium-input" style={{ padding: '0.25rem 0.5rem', width: '70px' }} value={editFormData.capacity} onChange={(e) => handleEditChange(e, 'capacity')} />
                             <select className="premium-input" style={{ padding: '0.25rem' }} value={editFormData.capacityUnit} onChange={(e) => handleEditChange(e, 'capacityUnit')}>
                               <option>MWp</option>
                               <option>kWp</option>
                             </select>
                          </div>
                        </td>
                        <td>
                          <select className="premium-input" style={{ padding: '0.25rem 0.5rem', width: '100px' }} value={editFormData.region} onChange={(e) => handleEditChange(e, 'region')}>
                            {['North', 'South', 'East', 'West', 'Central'].map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </td>
                        <td>
                          <input className="premium-input" style={{ padding: '0.25rem 0.5rem', width: '100px' }} value={editFormData.state} onChange={(e) => handleEditChange(e, 'state')} />
                        </td>
                        <td>
                          <input className="premium-input" style={{ padding: '0.25rem 0.5rem', width: '100px' }} value={editFormData.city} onChange={(e) => handleEditChange(e, 'city')} />
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                             <button onClick={saveEdit} className="btn-ghost" style={{ padding: '0.25rem', color: 'var(--accent-color)' }}><Save size={16} /></button>
                             <button onClick={cancelEdit} className="btn-ghost" style={{ padding: '0.25rem', color: '#ef4444' }}><X size={16} /></button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ fontWeight: 600 }}>{row.vendorName}</td>
                        <td>
                          <span style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.65rem',
                            borderRadius: '99px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            background: row.cmesEntity === 'COGEN' ? 'rgba(251,191,36,0.15)' : row.cmesEntity === 'JUPITER' ? 'rgba(139,92,246,0.15)' : row.cmesEntity === 'POWER 1' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                            color: row.cmesEntity === 'COGEN' ? '#f59e0b' : row.cmesEntity === 'JUPITER' ? '#7c3aed' : row.cmesEntity === 'POWER 1' ? '#ef4444' : '#10b981',
                          }}>{row.cmesEntity || 'CMES'}</span>
                        </td>
                        <td>{row.plantName}</td>
                        <td>{row.capacity} {row.capacityUnit}</td>
                        <td>{row.region}</td>
                        <td>{row.state}</td>
                        <td>{row.city}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => startEditing(row)} className="btn-ghost" style={{ padding: '0.25rem' }} title="Edit"><Edit2 size={16} /></button>
                            <button onClick={() => handleDeleteRow(row.id)} className="btn-ghost" style={{ padding: '0.25rem', color: '#ef4444' }} title="Delete"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {filteredPreviewData.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>No matching records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredPreviewData.length > previewPageSize && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Showing <strong>{(previewPage - 1) * previewPageSize + 1}</strong> to <strong>{Math.min(previewPage * previewPageSize, filteredPreviewData.length)}</strong> of <strong>{filteredPreviewData.length}</strong> records
              </span>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  className="btn-ghost"
                  disabled={previewPage === 1}
                  onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', opacity: previewPage === 1 ? 0.5 : 1 }}
                >
                  Previous
                </button>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, padding: '0 0.5rem' }}>
                  Page {previewPage} of {Math.ceil(filteredPreviewData.length / previewPageSize)}
                </span>
                <button
                  className="btn-ghost"
                  disabled={previewPage >= Math.ceil(filteredPreviewData.length / previewPageSize)}
                  onClick={() => setPreviewPage(p => Math.min(Math.ceil(filteredPreviewData.length / previewPageSize), p + 1))}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', opacity: previewPage >= Math.ceil(filteredPreviewData.length / previewPageSize) ? 0.5 : 1 }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {results && !previewData && (
        <div className="glass-panel animate-fade-in-up" style={{ marginTop: '2rem', padding: '1.5rem', borderLeft: '4px solid var(--accent-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <CheckCircle size={24} color="var(--accent-color)" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>Import Successful</h3>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
                <div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Records Added</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{results.added}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Vendors Created</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{results.newVendors}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Added to Existing</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{results.existingVendors}</p>
                </div>
                {results.errors > 0 && (
                  <div>
                    <p style={{ fontSize: '0.85rem', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rows with Errors</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>{results.errors}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {state.uploadHistory && state.uploadHistory.length > 0 && (
        <div className="glass-panel animate-fade-in-up" style={{ marginTop: '2rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={20} color="var(--accent-color)" />
              Upload History
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Total Uploads: <strong style={{ color: 'var(--text-primary)' }}>{state.uploadHistory.length}</strong>
            </span>
          </div>
          <div className="table-container">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Uploaded By & Role</th>
                  <th>Upload Date & Time (12-Hour)</th>
                  <th>Records Added</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(state.uploadHistory || []).map(history => {
                  const uploaderName = history.uploadedBy || state.currentUser?.name || 'Admin User';
                  const uploaderRole = history.uploadedByRole || state.currentUser?.role || 'Admin';

                  return (
                    <tr key={history.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <FileText size={16} color="var(--accent-color)" />
                          <span>{history.fileName}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            {uploaderName}
                          </span>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '12px',
                            background: uploaderRole.toLowerCase() === 'admin' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: uploaderRole.toLowerCase() === 'admin' ? '#3b82f6' : '#10b981',
                            border: `1px solid ${uploaderRole.toLowerCase() === 'admin' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                          }}>
                            {uploaderRole}
                          </span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        {format12HourDateTime(history.timestamp)}
                      </td>
                      <td>{history.recordsCount}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          onClick={() => {
                            if(window.confirm('Move this upload to Recycle Bin? The import record will be stored safely.')) {
                              dispatch({ type: 'SOFT_DELETE_UPLOAD', payload: history.id, meta: { deletedBy: state.currentUser?.name, deletedByRole: state.currentUser?.role } });
                              showToast('Upload moved to Recycle Bin', 'success');
                            }
                          }} 
                          className="btn-ghost" 
                          style={{ padding: '0.4rem', color: '#ef4444', borderRadius: '6px', transition: 'all 0.2s' }} 
                          title="Delete Upload"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddExcel;

