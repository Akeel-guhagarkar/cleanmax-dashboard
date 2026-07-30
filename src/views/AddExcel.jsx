import React, { useRef, useState } from 'react';
import ExcelJS from 'exceljs';
import { useProcure } from '../context/ProcureContext';
import { calculateStatus } from '../utils/seedData';
import { formatDateToISO, generateDeterministicId } from '../utils/constants';
import { Upload, FileText, CheckCircle, AlertCircle, Trash2, Edit2, Save, X, Clock, User, Shield, Download } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { sendNotification } from '../utils/notify';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

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
  const [selectedHistoryIds, setSelectedHistoryIds] = useState([]);

  const allHistoryIds = React.useMemo(() => (state.uploadHistory || []).map(h => h.id), [state.uploadHistory]);
  const isAllHistorySelected = allHistoryIds.length > 0 && selectedHistoryIds.length === allHistoryIds.length;

  const toggleSelectAllHistory = () => {
    if (isAllHistorySelected) {
      setSelectedHistoryIds([]);
    } else {
      setSelectedHistoryIds([...allHistoryIds]);
    }
  };

  const toggleSelectHistoryRow = (id) => {
    setSelectedHistoryIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

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
      
      // ── SMART WORKSHEET SELECTOR ─────────────────────────────────────────────
      // Score EVERY worksheet by how many vendor-related header keywords it contains.
      // This prevents reading Chart1 or other non-data sheets that happen to be first.
      const VENDOR_KEYWORDS = [
        'vendorcode', 'vendorname', 'vendor', 'plantname', 'plant',
        'capacity', 'ponumber', 'startdate', 'enddate', 'region',
        'state', 'city', 'rate', 'entity', 'status'
      ];

      let worksheet = null;
      let bestScore = -1;

      for (const ws of workbook.worksheets) {
        let score = 0;
        let rowsChecked = 0;
        ws.eachRow((row, rowNumber) => {
          if (rowNumber > 15) return;
          row.eachCell((cell, colNumber) => {
            const cellVal = (() => {
              const v = cell.value;
              if (v === null || v === undefined) return '';
              if (typeof v === 'object') {
                if (v.richText) return v.richText.map(rt => rt.text).join('');
                if (v.result !== undefined && v.result !== null) return v.result.toString();
                if (v.text !== undefined && v.text !== null) return v.text.toString();
                return '';
              }
              return v.toString().trim();
            })().toLowerCase().replace(/[^a-z0-9]/g, '');
            if (VENDOR_KEYWORDS.includes(cellVal)) score++;
          });
          rowsChecked++;
        });
        if (score > bestScore) {
          bestScore = score;
          worksheet = ws;
        }
      }

      // Fallback to first worksheet if no keywords found at all
      if (!worksheet) worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new Error("No worksheet found in the Excel file.");
      }

      const parsedRows = [];
      let errors = 0;
      let consecutiveEmptyRows = 0;
      
      const getValRaw = (r, col) => {
        const cell = r.getCell(col);
        const val = cell.value;
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') {
          if (val.richText) return val.richText.map(rt => rt.text).join('');
          if (val.result !== undefined && val.result !== null) return val.result.toString();
          if (val.text !== undefined && val.text !== null) return val.text.toString();
          if (val instanceof Date) return val; 
          return '';
        }
        const str = val.toString().trim();
        if (str === '[object Object]') return '';
        return str;
      };

      // 1. Dynamic Header Row Finder (Scans first 15 rows to find the true header row with matching keywords)
      let headerRowNumber = 1;
      const headerMap = {};

      worksheet.eachRow((row, rowNumber) => {
        if (Object.keys(headerMap).length > 0 || rowNumber > 15) return; // Header already found

        let keywordCount = 0;
        row.eachCell((cell, colNumber) => {
          const text = getValRaw(row, colNumber).toLowerCase().replace(/[^a-z0-9]/g, '');
          if (['vendorcode', 'vendorname', 'vendor', 'plantname', 'plant', 'capacity', 'ponumber', 'startdate', 'enddate', 'region', 'state', 'city', 'rate', 'entity'].includes(text)) {
            keywordCount++;
          }
        });

        if (keywordCount >= 2) {
          headerRowNumber = rowNumber;
          row.eachCell((cell, colNumber) => {
            const val = getValRaw(row, colNumber).toLowerCase().replace(/[^a-z0-9]/g, '');
            if (val) headerMap[val] = colNumber;
          });
        }
      });

      // Fallback if no explicit header row keywords were found
      if (Object.keys(headerMap).length === 0) {
        headerRowNumber = 1;
        const firstRow = worksheet.getRow(1);
        firstRow.eachCell((cell, colNumber) => {
          const val = getValRaw(firstRow, colNumber).toLowerCase().replace(/[^a-z0-9]/g, '');
          if (val) headerMap[val] = colNumber;
        });
      }

      // 2. Parse Only Genuine Data Rows (Skip title banners & header row)
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber <= headerRowNumber) return; // Skip title banners & header row!

        try {
          const getMappedValInfo = (keys, defaultCol) => {
             for (const key of keys) {
               if (headerMap[key]) return { val: getValRaw(row, headerMap[key]), matchedKey: key };
             }
             return { val: getValRaw(row, defaultCol), matchedKey: '' };
          };

          const getMappedVal = (keys, defaultCol) => getMappedValInfo(keys, defaultCol).val;

          let vendorCode = getMappedVal(['vendorcode', 'code', 'vcode', 'vendorid', 'vendorno', 'vendor_code', 'suppliercode', 'supplier_code'], 1).toString().trim();
          let vendorName = getMappedVal(['vendorname', 'name', 'vendor', 'vname', 'vendor_name', 'supplier', 'suppliername', 'agency', 'company'], 2).toString().trim();
          
          let entityRaw = getMappedVal(['entity', 'cmesentity', 'cmes_entity', 'cmes', 'company', 'cmescompany', 'legalentity', 'entityname'], 3).toString().trim().toUpperCase();
          let cmesEntity = entityRaw || 'CMES';

          let plantName = getMappedVal(['plantname', 'plant', 'project', 'projectname', 'project_name', 'site', 'sitename', 'plant_name'], 4).toString().trim();

          const RESERVED_WORDS = ['vendor name', 'vendor', 'name', 'plant name', 'plant', 'project name', 'vendor code', 'header', 'n/a', 'undefined', 'null', '[object object]', 'object object', 'object'];
          const vNorm = vendorName.toLowerCase();
          const pNorm = plantName.toLowerCase();

          // Skip empty or header rows individually without breaking loop early
          if (!vendorName || !plantName || RESERVED_WORDS.includes(vNorm) || RESERVED_WORDS.includes(pNorm)) {
            return;
          }

          let capacityInfo = getMappedValInfo(['capacity', 'size', 'plantcapacity', 'capacitykwp', 'capacitymwp', 'capacitykw', 'capacitymw', 'kwp', 'mwp', 'plant_capacity'], 5);
          let capacityStr = capacityInfo.val.toString().trim();
          let capacity = parseFloat(capacityStr) || 0;
          let capacityUnit = 'kWp';
          
          if (capacityInfo.matchedKey.includes('mw') || capacityStr.toLowerCase().includes('mwp')) {
            capacityUnit = 'MWp';
          }

          let region = getMappedVal(['region', 'zone', 'area'], 6).toString().trim();
          let stateVal = getMappedVal(['state', 'statename', 'state_name'], 7).toString().trim();
          let city = getMappedVal(['city', 'location', 'cityname', 'city_name', 'district'], 8).toString().trim();
          let rateStr = getMappedVal(['rate', 'price', 'cost', 'unitrate', 'rateinr', 'rate_per_unit', 'pparate'], 9).toString().trim();
          let rate = parseFloat(rateStr) || 0;
          let poNumber = getMappedVal(['ponumber', 'po', 'order', 'pono', 'ponum', 'po_no', 'po_number', 'orderno'], 10).toString().trim();
          
          let startDate = getMappedVal(['startdate', 'start', 'contractstart', 'contract_start', 'startingdate', 'starting_date', 'commencement_date', 'po_start'], 11);
          let endDate = getMappedVal(['enddate', 'end', 'contractend', 'contract_end', 'endingdate', 'ending_date', 'expirydate', 'po_end'], 12);
          let status = getMappedVal(['status', 'state', 'contractstatus', 'renewalstatus', 'currentstatus'], 13).toString().trim();
          
          if (!vendorCode) {
             vendorCode = `VND-${Math.floor(1000 + Math.random() * 9000)}`;
          }

          const deterministicVendorId = generateDeterministicId('vnd', plantName, vendorName, vendorCode);

          parsedRows.push({
            id: deterministicVendorId,
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
            contractStart: formatDateToISO(startDate),
            contractEnd: formatDateToISO(endDate),
            status
          });
        } catch (e) {
          console.error("Error parsing row:", rowNumber, e);
          errors++;
        }
      });
      
      // Strict deduplication — keep only unique plantName + vendorCode rows
      const seenRowKeys = new Set();
      const uniqueParsedRows = parsedRows.filter(r => {
        const key = `${(r.plantName || '').toLowerCase().trim()}::${(r.vendorCode || '').toLowerCase().trim()}`;
        if (seenRowKeys.has(key)) return false;
        seenRowKeys.add(key);
        return true;
      });

      if (uniqueParsedRows.length > 0) {
        setPreviewData(uniqueParsedRows);
        if (errors > 0) {
           showToast(`Found ${uniqueParsedRows.length} valid row(s), but ${errors} rows had errors.`, 'warning');
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
    
    // Build sets of vendor identifiers already in state.vendors database
    const existingVendorCodes = new Set();
    const existingVendorNames = new Set();
    const existingPlantVendorKeys = new Set();

    (state.vendors || []).forEach(v => {
      if (!v) return;
      if (v.vendorCode) existingVendorCodes.add(String(v.vendorCode).toLowerCase().trim());
      if (v.vendorName) existingVendorNames.add(String(v.vendorName).toLowerCase().trim());
      const pName = (v.plantName || '').toLowerCase().trim();
      const vCode = (v.vendorCode || '').toLowerCase().trim();
      const vName = (v.vendorName || '').toLowerCase().trim();
      if (pName && vCode) existingPlantVendorKeys.add(`${pName}::${vCode}`);
      if (pName && vName) existingPlantVendorKeys.add(`${pName}::${vName}`);
    });

    const addedVendorIds = [];
    const addedProjectIds = [];
    
    const batchVendors = [];
    const batchProjects = [];

    // Track vendor codes/names created in this single batch run
    const batchCreatedVendorCodes = new Set();
    const batchCreatedVendorNames = new Set();

    previewData.forEach(row => {
      const rowCode = (row.vendorCode || '').toLowerCase().trim();
      const rowName = (row.vendorName || '').toLowerCase().trim();
      const rowPlant = (row.plantName || '').toLowerCase().trim();

      const isAlreadyInDatabase = 
        (rowCode && existingVendorCodes.has(rowCode)) ||
        (rowName && existingVendorNames.has(rowName)) ||
        (rowPlant && rowCode && existingPlantVendorKeys.has(`${rowPlant}::${rowCode}`)) ||
        (rowPlant && rowName && existingPlantVendorKeys.has(`${rowPlant}::${rowName}`));

      if (isAlreadyInDatabase) {
        existingVendorCount++;
      } else {
        const isNewVendorCompany = (!rowCode || !batchCreatedVendorCodes.has(rowCode)) && (!rowName || !batchCreatedVendorNames.has(rowName));
        if (isNewVendorCompany) {
          newVendorCount++;
          if (rowCode) batchCreatedVendorCodes.add(rowCode);
          if (rowName) batchCreatedVendorNames.add(rowName);
        } else {
          existingVendorCount++;
        }
      }

      const vendorId = row.id || generateDeterministicId('vnd', row.plantName, row.vendorName, row.vendorCode);
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

      const projectId = generateDeterministicId('prj', row.plantName, row.vendorName, row.vendorCode);
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
        uploadedRows: JSON.parse(JSON.stringify(previewData))
      }
    });

    sendNotification(dispatch, {
      title: '📊 Excel Import Complete',
      message: `${addedCount} vendor record(s) imported from "${currentFileName || 'Excel file'}" (${newVendorCount} new vendor(s), ${existingVendorCount} added to existing)`,
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

  const handleDeleteUpload = (history) => {
    if (!history) return;
    const isConfirmed = window.confirm(
      `Are you sure you want to delete "${history.fileName}"?\n\n` +
      `This will remove all ${history.recordsCount || 0} imported vendor and project records from your active Dashboard and move them safely to the Admin Recycle Bin.`
    );
    if (!isConfirmed) return;

    dispatch({
      type: 'SOFT_DELETE_UPLOAD',
      payload: history.id,
      meta: { deletedBy: state.currentUser?.name, deletedByRole: state.currentUser?.role }
    });

    showToast(`✅ "${history.fileName}" moved to Recycle Bin!`, 'success');
  };

  const handleBulkDeleteUploads = () => {
    if (selectedHistoryIds.length === 0) return;
    const isConfirmed = window.confirm(
      `Are you sure you want to delete ${selectedHistoryIds.length} selected upload history ${selectedHistoryIds.length === 1 ? 'file' : 'files'}?\n\n` +
      `This will remove all associated imported vendor and project records from your active Dashboard and move them safely to the Admin Recycle Bin.`
    );
    if (!isConfirmed) return;

    const deletedBy = state.currentUser?.name || 'Admin';
    const deletedByRole = state.currentUser?.role || 'admin';

    selectedHistoryIds.forEach(id => {
      dispatch({
        type: 'SOFT_DELETE_UPLOAD',
        payload: id,
        meta: { deletedBy, deletedByRole }
      });
    });

    showToast(`✅ ${selectedHistoryIds.length} upload history ${selectedHistoryIds.length === 1 ? 'file' : 'files'} moved to Recycle Bin!`, 'success');
    setSelectedHistoryIds([]);
  };

  const handleDownloadHistoryExcel = async (history) => {
    try {
      showToast(`Downloading "${history.fileName}"...`, 'info');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Uploaded Vendor Data');

      const headers = [
        'Vendor Code', 'Vendor Name', 'Entity', 'New Vendor Code', 'New Vendor Name',
        'Plant Name', 'Capacity', 'Region', 'State', 'City',
        'Rate (₹)', 'PO No', 'Starting Date', 'Ending Date', 'Status',
        'Rate Escalation (%)', 'Logged By & Role'
      ];

      const headerRow = worksheet.addRow(headers);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      let rowsToExport = history.uploadedRows || [];

      if (rowsToExport.length === 0 && history.vendorIds && history.vendorIds.length > 0) {
        const vSet = new Set(history.vendorIds);
        rowsToExport = (state.vendors || []).filter(v => vSet.has(v.id)).map(v => ({
          vendorCode: v.vendorCode,
          vendorName: v.vendorName,
          cmesEntity: v.cmesEntity,
          plantName: v.plantName,
          capacity: v.plantCapacity,
          capacityUnit: v.capacityUnit || 'kWp',
          region: v.region,
          state: v.state,
          city: v.city,
          rate: v.rate,
          poNumber: v.poNumber,
          contractStart: v.contractStart,
          contractEnd: v.contractEnd,
          status: v.status
        }));
      }

      if (rowsToExport.length === 0) {
        rowsToExport = (state.vendors || []).slice(0, history.recordsCount || 5).map(v => ({
          vendorCode: v.vendorCode,
          vendorName: v.vendorName,
          cmesEntity: v.cmesEntity,
          plantName: v.plantName,
          capacity: v.plantCapacity,
          capacityUnit: v.capacityUnit || 'kWp',
          region: v.region,
          state: v.state,
          city: v.city,
          rate: v.rate,
          poNumber: v.poNumber,
          contractStart: v.contractStart,
          contractEnd: v.contractEnd,
          status: v.status
        }));
      }

      rowsToExport.forEach(r => {
        worksheet.addRow([
          r.vendorCode || '—',
          r.vendorName || '—',
          r.cmesEntity || 'CMES',
          '—',
          '—',
          r.plantName || '—',
          `${r.capacity || r.plantCapacity || 0} ${r.capacityUnit || 'kWp'}`,
          r.region || '—',
          r.state || '—',
          r.city || '—',
          r.rate || 0,
          r.poNumber || '—',
          r.contractStart || '—',
          r.contractEnd || '—',
          r.status || 'Active',
          '0%',
          `${history.uploadedBy || 'Admin User'} (${history.uploadedByRole || 'Admin'})`
        ]);
      });

      worksheet.columns.forEach(column => {
        column.width = 18;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const downloadName = history.fileName && history.fileName.endsWith('.xlsx') ? history.fileName : `${history.fileName || 'Uploaded_File'}.xlsx`;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`📥 ${downloadName} downloaded successfully!`, 'success');
    } catch (err) {
      console.error("Error downloading history Excel file:", err);
      showToast('❌ Failed to download Excel file', 'error');
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
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Add & Renew Vendors via Excel</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Upload your Excel sheet to bulk import new vendors or perform contract renewals.</p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.35rem' }}>
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
                            {['North', 'South', 'East', 'West'].map(r => <option key={r} value={r}>{r}</option>)}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={20} color="var(--accent-color)" />
              Upload History
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {selectedHistoryIds.length > 0 && (
                <button
                  onClick={handleBulkDeleteUploads}
                  className="btn-ghost"
                  style={{
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    padding: '0.4rem 0.85rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                    transition: 'all 0.2s ease'
                  }}
                  title="Delete all selected upload history records"
                >
                  <Trash2 size={15} />
                  Delete Selected ({selectedHistoryIds.length})
                </button>
              )}
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Total Uploads: <strong style={{ color: 'var(--text-primary)' }}>{state.uploadHistory.length}</strong>
              </span>
            </div>
          </div>
          <div className="table-container">
            <table className="premium-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={isAllHistorySelected} 
                      onChange={toggleSelectAllHistory}
                      title="Select All Uploads"
                      style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-color)' }}
                    />
                  </th>
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
                  const isSelected = selectedHistoryIds.includes(history.id);

                  return (
                    <tr key={history.id} style={{ backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.05)' : 'transparent' }}>
                      <td style={{ textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          checked={isSelected} 
                          onChange={() => toggleSelectHistoryRow(history.id)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-color)' }}
                        />
                      </td>
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
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', alignItems: 'center' }}>
                          <button 
                            onClick={() => handleDownloadHistoryExcel(history)} 
                            className="btn-ghost" 
                            style={{ padding: '0.4rem', color: 'var(--accent-color)', borderRadius: '6px', transition: 'all 0.2s' }} 
                            title={`Download ${history.fileName}`}
                          >
                            <Download size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteUpload(history)} 
                            className="btn-ghost" 
                            style={{ padding: '0.4rem', color: '#ef4444', borderRadius: '6px', transition: 'all 0.2s' }} 
                            title="Delete Upload & Move Records to Recycle Bin"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
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

