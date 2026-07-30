import React, { useState, useMemo, useDeferredValue } from 'react';
import ExcelJS from 'exceljs';
import { useProcure } from '../context/ProcureContext';
import { getStatusClass, getCapacityInMW, REGION_COLORS, formatDateForDisplay, formatDateToISO, parseFlexibleDate } from '../utils/constants';
import { History, RefreshCw, AlertTriangle, CheckCircle2, TrendingUp, Search, Calendar, FileText, User, ArrowRight, PlusCircle, Edit3, X, Download } from 'lucide-react';
import { sendNotification } from '../utils/notify';
import { v4 as uuidv4 } from 'uuid';

const format12HourDateTime = (timestamp) => {
  if (!timestamp) return 'N/A';
  const d = parseFlexibleDate(timestamp);
  if (!d) return 'N/A';
  return d.toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

const formatDateOnly = (dateStr) => {
  if (!dateStr) return 'N/A';
  return formatDateForDisplay(dateStr);
};

const Renewals = () => {
  const { state, dispatch, showToast } = useProcure();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [regionFilter, setRegionFilter] = useState('All');
  const [selectedForRenewal, setSelectedForRenewal] = useState(null);
  
  // Quick renew modal form state
  const [renewForm, setRenewForm] = useState({
    vendorCode: '',
    vendorName: '',
    poNumber: '',
    rate: '',
    contractStart: '',
    contractEnd: '',
  });

  const archivedList = state.archivedContracts || [];
  const vendorsList = state.vendors || [];

  // Export Renewal Audit Excel Generator
  const handleExportRenewalExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'CleanMax Procurement System';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Contract Renewals');

      // Title Banner
      worksheet.mergeCells('A1:Q2');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'CLEANMAX CONTRACT RENEWALS & PRE-EDIT HISTORICAL AUDIT REPORT';
      titleCell.font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F172A' } // Dark Slate
      };

      // Header Row (Row 3)
      const headers = [
        'Vendor Code', 'Vendor Name', 'Entity', 'New Vendor Code', 'New Vendor Name',
        'Plant Name', 'Capacity', 'Region', 'State', 'City',
        'Rate (₹)', 'PO No', 'Starting Date', 'Ending Date', 'Status',
        'Rate Escalation (%)', 'Logged By & Role'
      ];
      
      const headerRow = worksheet.getRow(3);
      headerRow.values = headers;
      headerRow.height = 26;
      headerRow.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF10B981' } // Emerald Green
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

      const colWidths = [14, 26, 12, 16, 26, 26, 16, 12, 14, 16, 14, 16, 15, 15, 22, 18, 24];
      colWidths.forEach((w, idx) => {
        const col = worksheet.getColumn(idx + 1);
        col.width = w;
      });

      worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 3, showGridLines: true }];

      // Thin border definition for clean table grid
      const thinBorder = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };

      // 1. Add Pre-Edit Historical Snapshots (Renewed / Replaced Vendors)
      archivedList.forEach(arch => {
        const rateDiff = Number(arch.newRate || 0) - Number(arch.oldRate || 0);
        const ratePct = arch.oldRate ? ((rateDiff / arch.oldRate) * 100).toFixed(1) + '%' : '0%';
        const isVendorChanged = arch.newVendorName && arch.newVendorName !== arch.oldVendorName;
        const newVCode = isVendorChanged ? (arch.newVendorCode || 'NEW') : '-';
        const newVName = isVendorChanged ? arch.newVendorName : '-';

        const row = worksheet.addRow([
          arch.vendorCode,                                       // 1. Vendor Code
          arch.oldVendorName || arch.vendorName || '-',          // 2. Vendor Name
          arch.cmesEntity || 'CMES',                             // 3. Entity
          newVCode,                                              // 4. New Vendor Code
          newVName,                                              // 5. New Vendor Name
          arch.plantName,                                        // 6. Plant Name
          `${arch.plantCapacity} ${arch.capacityUnit}`,          // 7. Capacity
          arch.region,                                           // 8. Region
          arch.state || '-',                                     // 9. State
          arch.city || '-',                                      // 10. City
          arch.newRate || arch.oldRate || arch.rate || 0,        // 11. Rate (₹)
          arch.newPoNumber || arch.oldPoNumber || arch.poNumber || '-', // 12. PO No
          formatDateOnly(arch.oldContractStart),                 // 13. Starting Date
          formatDateOnly(arch.oldContractEnd),                   // 14. Ending Date
          arch.renewalStatus || 'Renewed (Historical)',          // 15. Status
          ratePct,                                               // 16. Rate Escalation (%)
          `${arch.renewedBy || 'Admin'} (${arch.renewedByRole || 'Admin'})` // 17. Logged By & Role
        ]);
        row.height = 22;
      });

      // 2. Add Active & Pending Vendor Contracts
      vendorsList.forEach(v => {
        const isPending = String(v.status || '').toLowerCase().includes('expir');
        const renewalStatus = isPending ? (v.status === 'Expired' ? 'Expired' : 'Expiring Soon') : 'Active';

        const row = worksheet.addRow([
          v.vendorCode,                                          // 1. Vendor Code
          v.vendorName,                                          // 2. Vendor Name
          v.cmesEntity || 'CMES',                                // 3. Entity
          '-',                                                   // 4. New Vendor Code
          '-',                                                   // 5. New Vendor Name
          v.plantName,                                           // 6. Plant Name
          `${v.plantCapacity} ${v.capacityUnit}`,                // 7. Capacity
          v.region,                                              // 8. Region
          v.state || '-',                                        // 9. State
          v.city || '-',                                         // 10. City
          v.rate || 0,                                           // 11. Rate (₹)
          v.poNumber || '-',                                     // 12. PO No
          formatDateOnly(v.contractStart),                       // 13. Starting Date
          formatDateOnly(v.contractEnd),                         // 14. Ending Date
          renewalStatus,                                         // 15. Status
          '0%',                                                  // 16. Rate Escalation (%)
          `${v.lastEditedBy || state.currentUser?.name || 'Admin'} (${state.currentUser?.role || 'Admin'})` // 17. Logged By & Role
        ]);
        row.height = 22;
      });

      // Style & Format Every Table Cell
      worksheet.eachRow((row, rowNo) => {
        if (rowNo > 3) {
          const statusVal = String(row.getCell(9).value || '');

          // Full Row Highlighting for Expiring Soon & Expired contracts
          let rowBgColor = rowNo % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF';
          let textColor = 'FF0F172A';

          if (statusVal.includes('Pending') || statusVal.includes('Expiring')) {
            rowBgColor = 'FFFED7AA'; // Rich Warm Orange/Amber whole row
            textColor = 'FF7C2D12'; // Dark Orange/Amber Text
          } else if (statusVal === 'Expired') {
            rowBgColor = 'FFFECDD3'; // Rich Light Red/Rose whole row
            textColor = 'FF991B1B'; // Dark Red Text
          }

          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBgColor } };

          row.eachCell((cell, colNo) => {
            cell.border = thinBorder;
            cell.font = { name: 'Arial', size: 9, color: { argb: textColor } };
            cell.alignment = { vertical: 'middle' };

            // Center align: Vendor Code (1), Entity (3), New Vendor Code (4), Region (8), State (9), Dates (13, 14), Status (15)
            if ([1, 3, 4, 8, 9, 13, 14, 15].includes(colNo)) {
              cell.alignment = { vertical: 'middle', horizontal: 'center' };
            }
            // Right align: Capacity (7), Rate (11), PO No (12), Escalation (16)
            if ([7, 11, 12, 16].includes(colNo)) {
              cell.alignment = { vertical: 'middle', horizontal: 'right' };
            }
          });

          // Specific cell color coding for Status (Column 15)
          const statusCell = row.getCell(15);
          const statusStr = String(statusCell.value || '');

          if (statusStr.includes('Renewed') || statusStr.includes('Replaced')) {
            statusCell.font = { name: 'Arial', size: 9, color: { argb: 'FF475569' }, italic: true };
          } else if (statusStr.includes('Expiring') || statusStr.includes('Pending')) {
            statusCell.font = { name: 'Arial', size: 9, color: { argb: 'FFD97706' }, bold: true };
          } else if (statusStr === 'Active') {
            statusCell.font = { name: 'Arial', size: 9, color: { argb: 'FF059669' }, bold: true };
          }
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CleanMax_Contract_Renewals_Audit_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      showToast('Renewal Audit Excel Report downloaded successfully!', 'success');
    } catch (err) {
      console.error('Excel Export Error:', err);
      showToast('Failed to export Renewal Excel report.', 'error');
    }
  };

  // Compute pending renewal contracts (Expired or Expiring Soon)
  const pendingRenewals = useMemo(() => {
    return vendorsList.filter(v => {
      const s = String(v.status || '').toLowerCase();
      return s.includes('expir') || s.includes('expired');
    });
  }, [vendorsList]);

  // Compute metrics
  const totalRenewedCount = archivedList.length;
  const pendingCount = pendingRenewals.length;

  const avgEscalationPct = useMemo(() => {
    if (archivedList.length === 0) return 0;
    let totalPct = 0;
    let count = 0;
    archivedList.forEach(item => {
      if (item.oldRate && item.newRate && item.oldRate > 0) {
        const pct = ((item.newRate - item.oldRate) / item.oldRate) * 100;
        totalPct += pct;
        count++;
      }
    });
    return count > 0 ? (totalPct / count).toFixed(1) : 0;
  }, [archivedList]);

  const deferredSearchTerm = useDeferredValue(searchTerm);

  // Merged timeline view (archived snapshots + current pending/active contracts)
  const mergedRecords = useMemo(() => {
    const records = [];

    // 1. Archived historical snapshots
    archivedList.forEach(item => {
      records.push({
        id: item.id,
        type: 'archived',
        plantName: item.plantName,
        vendorName: item.vendorName,
        vendorCode: item.vendorCode,
        region: item.region,
        oldPo: item.oldPoNumber || '—',
        newPo: item.newPoNumber || '—',
        oldRate: item.oldRate,
        newRate: item.newRate,
        periodOld: `${formatDateOnly(item.oldContractStart)} - ${formatDateOnly(item.oldContractEnd)}`,
        periodNew: `${formatDateOnly(item.newContractStart)} - ${formatDateOnly(item.newContractEnd)}`,
        renewalStatus: 'Renewed (Snapshot)',
        badgeClass: 'status-active',
        renewedBy: item.renewedBy || 'Admin',
        renewedByRole: item.renewedByRole || 'Admin',
        timestamp: item.renewedAt,
        capacity: `${item.plantCapacity || 0} ${item.capacityUnit || 'kWp'}`,
        rawVendor: item
      });
    });

    // 2. Current vendors
    vendorsList.forEach(item => {
      const statusStr = item.status || 'Active';
      const isPending = String(statusStr).toLowerCase().includes('expir');

      let startIso = formatDateToISO(item.contractStart);
      let endIso = formatDateToISO(item.contractEnd);

      // Auto-heal corrupted end date where contractEnd === contractStart
      if (startIso && endIso && startIso === endIso) {
        const sDate = parseFlexibleDate(startIso);
        if (sDate) {
          const healDate = new Date(sDate);
          healDate.setUTCFullYear(healDate.getUTCFullYear() + 2);
          endIso = formatDateToISO(healDate);
        }
      }

      records.push({
        id: item.id,
        type: 'current',
        plantName: item.plantName,
        vendorName: item.vendorName,
        vendorCode: item.vendorCode,
        region: item.region,
        oldPo: '—',
        newPo: item.poNumber || '—',
        oldRate: item.rate,
        newRate: item.rate,
        periodOld: '—',
        periodNew: `${formatDateOnly(startIso)} - ${formatDateOnly(endIso)}`,
        renewalStatus: statusStr,
        badgeClass: getStatusClass(statusStr),
        renewedBy: item.lastEditedBy || '—',
        renewedByRole: 'Manager',
        timestamp: item.updatedAt || item.createdAt,
        capacity: `${item.plantCapacity || 0} ${item.capacityUnit || 'kWp'}`,
        rawVendor: { ...item, contractStart: startIso, contractEnd: endIso },
        isPending
      });
    });

    return records.filter(rec => {
      // Search
      const q = deferredSearchTerm.toLowerCase();
      const matchesSearch = !q || 
        (rec.plantName && rec.plantName.toLowerCase().includes(q)) ||
        (rec.vendorName && rec.vendorName.toLowerCase().includes(q)) ||
        (rec.newPo && rec.newPo.toLowerCase().includes(q)) ||
        (rec.region && rec.region.toLowerCase().includes(q));

      // Status filter
      let matchesStatus = true;
      if (statusFilter === 'Renewed') matchesStatus = rec.type === 'archived';
      if (statusFilter === 'Pending') matchesStatus = rec.isPending;
      if (statusFilter === 'Active') matchesStatus = String(rec.renewalStatus).toLowerCase() === 'active';

      // Region filter
      let matchesRegion = true;
      if (regionFilter !== 'All') matchesRegion = rec.region === regionFilter;

      return matchesSearch && matchesStatus && matchesRegion;
    }).sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  }, [archivedList, vendorsList, deferredSearchTerm, statusFilter, regionFilter]);

  // Open Quick Renew modal
  const handleOpenRenewModal = (vendor) => {
    setSelectedForRenewal(vendor);
    
    const startIso = formatDateToISO(vendor.contractStart);
    const startDateObj = parseFlexibleDate(startIso) || new Date();
    
    let endIso = formatDateToISO(vendor.contractEnd);
    if (endIso === startIso || !vendor.contractEnd) {
      const twoYears = new Date(startDateObj);
      twoYears.setUTCFullYear(twoYears.getUTCFullYear() + 2);
      endIso = formatDateToISO(twoYears);
    }

    setRenewForm({
      vendorCode: vendor.vendorCode || '',
      vendorName: vendor.vendorName || '',
      poNumber: vendor.poNumber ? (vendor.poNumber.endsWith('-R') ? vendor.poNumber : `${vendor.poNumber}-R`) : '4600000999',
      rate: vendor.rate ? Math.round(Number(vendor.rate) * 1.05) : 30, // 5% escalation default
      contractStart: startIso,
      contractEnd: endIso,
    });
  };

  // Submit Quick Renewal
  const handleConfirmRenewal = (e) => {
    e.preventDefault();
    if (!selectedForRenewal) return;

    const vendor = selectedForRenewal;

    // 1. Create archived snapshot
    const archiveSnapshot = {
      id: `renew-${uuidv4()}`,
      vendorId: vendor.id,
      vendorCode: vendor.vendorCode,
      oldVendorName: vendor.vendorName,
      newVendorCode: renewForm.vendorCode,
      newVendorName: renewForm.vendorName,
      vendorName: renewForm.vendorName || vendor.vendorName,
      plantName: vendor.plantName,
      region: vendor.region,
      state: vendor.state,
      city: vendor.city,
      oldPoNumber: vendor.poNumber,
      newPoNumber: renewForm.poNumber,
      oldRate: Number(vendor.rate) || 0,
      newRate: Number(renewForm.rate) || 0,
      oldContractStart: vendor.contractStart,
      oldContractEnd: vendor.contractEnd,
      newContractStart: renewForm.contractStart,
      newContractEnd: renewForm.contractEnd,
      plantCapacity: vendor.plantCapacity,
      capacityUnit: vendor.capacityUnit,
      renewalStatus: 'Renewed',
      renewedAt: new Date().toISOString(),
      renewedBy: state.currentUser?.name || 'Admin User',
      renewedByRole: state.currentUser?.role || 'Admin',
    };

    // 2. Dispatch archive snapshot
    dispatch({ type: 'ADD_ARCHIVED_CONTRACT', payload: archiveSnapshot });

    // 3. Update active vendor record to Active
    const updatedVendor = {
      ...vendor,
      vendorCode: renewForm.vendorCode || vendor.vendorCode,
      vendorName: renewForm.vendorName || vendor.vendorName,
      poNumber: renewForm.poNumber,
      rate: Number(renewForm.rate),
      contractStart: renewForm.contractStart,
      contractEnd: renewForm.contractEnd,
      status: 'Active',
      lastRenewedAt: new Date().toISOString(),
      renewalCount: (vendor.renewalCount || 0) + 1,
    };

    dispatch({ type: 'UPDATE_VENDOR', payload: updatedVendor });

    // 4. Dispatch notification
    sendNotification(dispatch, {
      title: '🔄 Contract Auto-Renewed',
      message: `Plant "${vendor.plantName}" renewed with new PO ${renewForm.poNumber} at ₹${renewForm.rate}/unit`,
      type: 'success',
      targetRoles: ['admin', 'manager'],
      actor: state.currentUser?.name,
      actorRole: state.currentUser?.role,
      skipForAdmin: false,
    });

    showToast(`Contract for "${vendor.plantName}" successfully renewed!`, 'success');
    setSelectedForRenewal(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Header */}
      <div className="animate-stagger" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <History size={28} color="var(--accent-color)" />
            <h1 style={{ fontSize: '2rem', margin: 0 }}>Contract Renewal & History Center</h1>
          </div>
          <p className="text-secondary" style={{ marginTop: '0.35rem' }}>
            Track automated contract renewals, pre-edit data snapshots, rate escalations, and audit logs.
          </p>
        </div>

        <button
          onClick={handleExportRenewalExcel}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.65rem 1.25rem',
            fontWeight: 700,
            borderRadius: '10px',
            background: '#10b981',
            color: '#ffffff',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#059669'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#10b981'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <Download size={18} />
          Export Renewal Excel Report
        </button>
      </div>

      {/* Metric Cards */}
      <div className="responsive-grid animate-stagger delay-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.85rem', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '12px', color: '#10b981' }}>
            <RefreshCw size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>{totalRenewedCount}</div>
            <div className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Renewed Snapshots</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.85rem', background: 'rgba(245, 158, 11, 0.15)', borderRadius: '12px', color: '#f59e0b' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f59e0b' }}>{pendingCount}</div>
            <div className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending Renewal</div>
          </div>
        </div>



        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.85rem', background: 'rgba(168, 85, 247, 0.15)', borderRadius: '12px', color: '#a855f7' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>{vendorsList.length}</div>
            <div className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Active Sites</div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel animate-stagger delay-2" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {/* Row 1: Search */}
        <div className="input-wrapper" style={{ width: '100%' }}>
          <Search className="input-icon" size={18} style={{ left: '0.85rem' }} />
          <input
            type="text"
            placeholder="Search by site, vendor, PO number, region..."
            className="premium-input"
            style={{ paddingLeft: '2.5rem', width: '100%' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Row 2: Filter buttons + Region */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Filter:</span>
          {/* Status filter pill buttons */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', padding: '0.2rem', borderRadius: '10px', border: '1px solid var(--border-color)', gap: '0.1rem' }}>
            {['All', 'Renewed', 'Pending', 'Active'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '0.35rem 1rem',
                  fontSize: '0.8rem',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  background: statusFilter === st ? 'var(--accent-color)' : 'transparent',
                  color: statusFilter === st ? '#fff' : 'var(--text-secondary)',
                  fontWeight: statusFilter === st ? 700 : 500,
                  transition: 'all 0.18s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                {st}
              </button>
            ))}
          </div>

          <div style={{ width: '1px', height: '28px', background: 'var(--border-color)' }} />

          {/* Region filter */}
          <select
            className="premium-input"
            style={{ padding: '0.42rem 1rem', fontSize: '0.82rem', minWidth: '130px' }}
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
          >
            <option value="All">All Regions</option>
            <option value="North">North</option>
            <option value="South">South</option>
            <option value="West">West</option>
            <option value="East">East</option>
          </select>

          <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            {mergedRecords.length} record{mergedRecords.length !== 1 ? 's' : ''} found
          </span>
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-panel animate-stagger delay-3" style={{ padding: '0' }}>
        {/* Table hint bar */}
        <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(245,158,11,0.04)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}>
          <RefreshCw size={14} color="#f59e0b" />
          <span style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 600 }}>Click an Expired or Expiring Soon contract row to open the renewal form</span>
        </div>
        <div className="table-container" style={{ width: '100%', overflowX: 'auto', padding: '0 0 0.5rem 0' }}>
          <table className="premium-table" style={{ width: '100%', tableLayout: 'auto', minWidth: '900px' }}>
            <thead>
              <tr>
                <th style={{ padding: '0.75rem 1rem' }}>Plant Name &amp; Vendor</th>
                <th style={{ padding: '0.75rem 1rem' }}>Region</th>
                <th style={{ padding: '0.75rem 1rem' }}>PO Transition</th>
                <th style={{ padding: '0.75rem 1rem' }}>Rate Escalation</th>
                <th style={{ padding: '0.75rem 1rem' }}>Contract Period</th>
                <th style={{ padding: '0.75rem 1rem' }}>Renewal Status</th>
                <th style={{ padding: '0.75rem 1rem' }}>Logged By</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {mergedRecords.map((record) => {
                const isPending = record.isPending;
                const isArchived = record.type === 'archived';
                const isClickable = isPending; // ONLY Expired or Expiring Soon contracts can be renewed!
                const rateDiff = record.newRate - record.oldRate;

                return (
                  <tr 
                    key={record.id} 
                    style={{ 
                      opacity: isArchived ? 0.82 : 1,
                      cursor: isClickable ? 'pointer' : 'default',
                      transition: 'background 0.18s, box-shadow 0.18s',
                      background: isPending ? 'rgba(245,158,11,0.03)' : 'transparent'
                    }}
                    title={isClickable ? `Click to renew: ${record.plantName}` : ''}
                    onClick={() => {
                      if (isClickable) handleOpenRenewModal(record.rawVendor);
                    }}
                    onMouseEnter={e => {
                      if (isPending) e.currentTarget.style.background = 'rgba(245, 158, 11, 0.08)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = isPending ? 'rgba(245,158,11,0.03)' : 'transparent';
                    }}
                  >
                    {/* Plant & Vendor */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div>
                        <div style={{ 
                          fontWeight: 700, fontSize: '0.9rem', 
                          color: isPending ? '#f59e0b' : 'var(--text-primary)',
                        }}>
                          {record.plantName}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                          {record.vendorName} &nbsp;•&nbsp; <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{record.capacity}</span>
                        </div>
                      </div>
                    </td>

                    {/* Region */}
                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                        fontSize: '0.82rem', fontWeight: 600,
                        color: REGION_COLORS[record.region] || 'var(--text-primary)'
                      }}>
                        <span style={{ width: 9, height: 9, borderRadius: '50%', background: REGION_COLORS[record.region] || '#fff', flexShrink: 0, boxShadow: `0 0 6px ${REGION_COLORS[record.region] || '#fff'}` }}></span>
                        {record.region}
                      </span>
                    </td>

                    {/* PO Transition */}
                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: '0.825rem', fontFamily: 'monospace' }}>
                        {isArchived ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ textDecoration: 'line-through', opacity: 0.55 }}>{record.oldPo}</span>
                            <ArrowRight size={12} color="var(--accent-color)" />
                            <strong style={{ color: 'var(--text-primary)' }}>{record.newPo}</strong>
                          </div>
                        ) : (
                          <strong style={{ color: 'var(--text-primary)' }}>{record.newPo}</strong>
                        )}
                      </div>
                    </td>

                    {/* Rate Escalation */}
                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>₹{record.newRate}/unit</div>
                      {isArchived && rateDiff !== 0 && (
                        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: rateDiff > 0 ? '#10b981' : '#ef4444', marginTop: '0.15rem' }}>
                          {rateDiff > 0 ? `+₹${rateDiff.toFixed(1)} (+${((rateDiff / record.oldRate) * 100).toFixed(1)}%)` : `-₹${Math.abs(rateDiff).toFixed(1)}`}
                        </div>
                      )}
                    </td>

                    {/* Contract Period */}
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {record.periodNew}
                    </td>

                    {/* Renewal Status Badge */}
                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                      <span className={`status-pill ${record.badgeClass}`}>
                        {record.renewalStatus}
                      </span>
                    </td>

                    {/* Logged By */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <User size={13} color="var(--text-secondary)" />
                        <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                          {record.renewedBy}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', marginTop: '0.1rem' }}>
                        {format12HourDateTime(record.timestamp)}
                      </div>
                    </td>

                    {/* Action */}
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {isPending ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenRenewModal(record.rawVendor); }}
                          style={{
                            padding: '0.35rem 0.85rem',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            color: '#f59e0b',
                            border: '1px solid rgba(245,158,11,0.4)',
                            borderRadius: '8px',
                            background: 'rgba(245,158,11,0.1)',
                            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                            transition: 'all 0.18s'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
                          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                        >
                          <RefreshCw size={12} />
                          Renew Now
                        </button>
                      ) : isArchived ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          <History size={11} /> Snapshot
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {mergedRecords.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                    No contract renewal history records found matching your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Premium Renewal Modal */}
      {selectedForRenewal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '1rem'
        }}>
          <style>{`
            .renew-modal-input {
              background-color: #ffffff !important;
              color: #111827 !important;
              border-color: rgba(0, 0, 0, 0.15) !important;
              border-radius: 8px !important;
              transition: border-color 0.2s, box-shadow 0.2s !important;
            }
            .renew-modal-input:focus {
              border-color: #10b981 !important;
              box-shadow: 0 0 0 3px rgba(16,185,129,0.2) !important;
              outline: none !important;
            }
            .renew-section-label {
              display: block;
              margin-bottom: 0.5rem;
              font-size: 0.875rem;
              font-weight: 600;
              color: var(--text-primary);
            }
          `}</style>

          <div className="glass-panel animate-fade-in-up" style={{
            width: '100%', maxWidth: '620px',
            maxHeight: '92vh', overflowY: 'auto',
            padding: '2.5rem',
            border: '1px solid rgba(16,185,129,0.25)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(16,185,129,0.1)'
          }}>

            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: '12px',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 14px rgba(16,185,129,0.4)'
                  }}>
                    <RefreshCw size={20} color="#fff" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                      Auto-Renew Contract
                    </h2>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                      Create a renewal snapshot and update the live contract
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedForRenewal(null)}
                style={{
                  background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)',
                  borderRadius: '50%', width: 36, height: 36,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--text-secondary)',
                  transition: 'all 0.18s'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#ef4444'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Plant Info Card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.04))',
              border: '1px solid rgba(16,185,129,0.25)',
              borderLeft: '4px solid #10b981',
              borderRadius: '12px',
              padding: '1.25rem 1.5rem',
              marginBottom: '2rem',
              display: 'flex', alignItems: 'flex-start', gap: '1rem'
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: '10px', flexShrink: 0,
                background: 'rgba(16,185,129,0.15)', color: '#10b981',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <FileText size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                  {selectedForRenewal.plantName}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <span>Vendor: <strong style={{ color: 'var(--text-primary)' }}>{selectedForRenewal.vendorName}</strong></span>
                  <span>Region: {selectedForRenewal.region} • {selectedForRenewal.city || selectedForRenewal.state}</span>
                  <span>Capacity: {selectedForRenewal.plantCapacity} {selectedForRenewal.capacityUnit}</span>
                </div>
                <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px', background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                    Current Rate: ₹{selectedForRenewal.rate}/unit
                  </span>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px', background: 'rgba(100,116,139,0.12)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                    PO: {selectedForRenewal.poNumber}
                  </span>
                </div>
              </div>
            </div>

            {/* Renewal Form */}
            <form onSubmit={handleConfirmRenewal} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

              {/* Section: New Contract Terms */}
              <div>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--accent-color)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <PlusCircle size={16} /> New Contract & Vendor Terms
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="renew-section-label">Vendor Code *</label>
                    <input
                      type="text"
                      required
                      className="premium-input renew-modal-input"
                      style={{ width: '100%' }}
                      placeholder="e.g. 104078"
                      value={renewForm.vendorCode}
                      onChange={(e) => setRenewForm({ ...renewForm, vendorCode: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="renew-section-label">Vendor Name *</label>
                    <input
                      type="text"
                      required
                      className="premium-input renew-modal-input"
                      style={{ width: '100%' }}
                      placeholder="e.g. Swapsol Energy"
                      value={renewForm.vendorName}
                      onChange={(e) => setRenewForm({ ...renewForm, vendorName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="renew-section-label">New PO Number *</label>
                    <input
                      type="text"
                      required
                      className="premium-input renew-modal-input"
                      style={{ width: '100%' }}
                      placeholder="e.g. 4600000999"
                      value={renewForm.poNumber}
                      onChange={(e) => setRenewForm({ ...renewForm, poNumber: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="renew-section-label">
                      New PPA Rate (₹/unit) *
                      {renewForm.rate && selectedForRenewal.rate && (
                        <span style={{
                          marginLeft: '0.75rem', fontSize: '0.75rem', fontWeight: 700,
                          color: Number(renewForm.rate) > Number(selectedForRenewal.rate) ? '#10b981' : Number(renewForm.rate) < Number(selectedForRenewal.rate) ? '#ef4444' : 'var(--text-secondary)'
                        }}>
                          {Number(renewForm.rate) > Number(selectedForRenewal.rate)
                            ? `▲ +₹${(Number(renewForm.rate) - Number(selectedForRenewal.rate)).toFixed(2)} escalation`
                            : Number(renewForm.rate) < Number(selectedForRenewal.rate)
                            ? `▼ -₹${(Number(selectedForRenewal.rate) - Number(renewForm.rate)).toFixed(2)} reduction`
                            : '= No change'}
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      className="premium-input renew-modal-input"
                      style={{ width: '100%' }}
                      placeholder="e.g. 35.50"
                      value={renewForm.rate}
                      onChange={(e) => setRenewForm({ ...renewForm, rate: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Section: New Contract Period */}
              <div>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--accent-color)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={16} /> New Contract Period
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="renew-section-label">Start Date *</label>
                    <input
                      type="date"
                      required
                      className="premium-input renew-modal-input"
                      style={{ width: '100%' }}
                      value={renewForm.contractStart}
                      onChange={(e) => setRenewForm({ ...renewForm, contractStart: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="renew-section-label">End Date *</label>
                    <input
                      type="date"
                      required
                      className="premium-input renew-modal-input"
                      style={{ width: '100%' }}
                      value={renewForm.contractEnd}
                      onChange={(e) => setRenewForm({ ...renewForm, contractEnd: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Auto-Archive Notice */}
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                padding: '0.9rem 1.1rem',
                background: 'rgba(16,185,129,0.07)',
                border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: '10px'
              }}>
                <CheckCircle2 size={18} color="#10b981" style={{ flexShrink: 0, marginTop: '0.05rem' }} />
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <strong style={{ color: '#10b981', fontWeight: 700 }}>Auto-Archive is ON</strong> — The current contract snapshot (PO, rate, dates) will be saved to the audit history before applying the new terms. Contract status will be set to <strong style={{ color: '#10b981' }}>Active</strong>.
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedForRenewal(null)}
                  className="btn-ghost"
                  style={{ padding: '0.75rem 2rem', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.75rem 2rem',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#ffffff',
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    boxShadow: '0 4px 16px rgba(16,185,129,0.45)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(16,185,129,0.55)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(16,185,129,0.45)'; }}
                >
                  <RefreshCw size={17} />
                  Confirm Renewal &amp; Auto-Archive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Renewals;
