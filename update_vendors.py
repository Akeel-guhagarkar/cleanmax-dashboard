import os

file_path = "c:/Users/user/OneDrive/Desktop/cleanmax website 1/src/views/Vendors.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Imports
content = content.replace(
    "import { Search, Plus, Download, Trash2, X, GitCompare, Mail, Phone, FileText, User, Building, Edit2 } from 'lucide-react';",
    "import { Search, Plus, Download, Trash2, X, GitCompare, Mail, Phone, FileText, User, Building, Edit2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';"
)

# 2. MONTHS
content = content.replace(
    "const ComparisonModal = ({ selectedVendors, onClose }) => {",
    "const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];\n\nconst ComparisonModal = ({ selectedVendors, onClose }) => {"
)

# 3. States
content = content.replace(
    "const Vendors = ({ initialFilter = '' }) => {\n  const { state, dispatch, showToast } = useProcure();\n  const [searchTerm, setSearchTerm] = useState(initialFilter);",
    "const Vendors = ({ initialFilter = '' }) => {\n  const { state, dispatch, showToast } = useProcure();\n  const [searchTerm, setSearchTerm] = useState(initialFilter);\n  const [isReportModalOpen, setIsReportModalOpen] = useState(false);\n  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());\n  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());"
)

# 4. handleExportCSV
old_handle = """  const handleExportCSV = () => {
    const headers = ['Vendor Code', 'Name', 'Plant', 'Capacity', 'Unit', 'Rate', 'Region', 'Status'];
    const rows = filteredAndSortedVendors.map(v => 
      [v.vendorCode, v.vendorName, v.plantName, v.plantCapacity, v.capacityUnit, v.rate, v.region, v.status].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendors_export_${new Date().getTime()}.csv`;
    a.click();
    showToast('Export successful', 'success');
  };"""

new_handle = """  const handleExportExcel = async () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    if (selectedYear > currentYear || (selectedYear === currentYear && selectedMonth > currentMonth)) {
      showToast('No data available for future dates', 'error');
      return;
    }

    const reportDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'CleanMax Analytics';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet(`Vendor Report - ${reportDate}`);

      // Premium Title Row (Merged Cells A1 to O2)
      worksheet.mergeCells('A1:O2');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = `CLEANMAX VENDOR PORTFOLIO REPORT - ${MONTHS[selectedMonth].toUpperCase()} ${selectedYear}`;
      titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F172A' } // Dark modern slate background
      };

      // Header Row (Row 3)
      const headers = [
        'Vendor Code', 'Vendor Name', 'Type', 'Region', 'State', 'City',
        'Plant Name', 'Capacity', 'Rate (INR)', 'Previous Rate',
        'PO Number', 'PR Number', 'Status', 'Contract Start', 'Contract End'
      ];
      worksheet.getRow(3).values = headers;

      const headerRow = worksheet.getRow(3);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF10B981' } // Green accent color
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      
      // Column Widths
      const columnWidths = [15, 25, 15, 15, 15, 15, 25, 15, 15, 15, 20, 20, 15, 15, 15];
      columnWidths.forEach((width, index) => {
        worksheet.getColumn(index + 1).width = width;
        worksheet.getColumn(index + 1).alignment = { vertical: 'middle' };
      });

      // Freeze header rows so when scrolling data, headers & title stay
      worksheet.views = [
        {state: 'frozen', xSplit: 0, ySplit: 3}
      ];

      // Add Data Rows
      state.vendors.forEach(v => {
        worksheet.addRow([
          v.vendorCode,
          v.vendorName,
          v.vendorType,
          v.region,
          v.state,
          v.city,
          v.plantName,
          `${v.plantCapacity} ${v.capacityUnit}`,
          v.rate,
          v.previousRate,
          v.poNumber,
          v.prNumber,
          v.status,
          new Date(v.contractStart).toLocaleDateString(),
          new Date(v.contractEnd).toLocaleDateString()
        ]);
      });

      // Add subtle alternating row colors for better readability
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 3) { // Skip title and header
          if (rowNumber % 2 === 0) {
            row.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF8FAFC' } // Very light slate/gray
            };
          }
          // Highlight Expiring or Expired statuses
          const statusCell = row.getCell(13); // Status column
          if (statusCell.value === 'Expiring Soon') {
            statusCell.font = { color: { argb: 'FFD97706' }, bold: true }; // Amber
          } else if (statusCell.value === 'Expired') {
            statusCell.font = { color: { argb: 'FFDC2626' }, bold: true }; // Red
          } else {
            statusCell.font = { color: { argb: 'FF059669' }, bold: true }; // Green
          }
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CleanMax_Vendor_Report_${MONTHS[selectedMonth]}_${selectedYear}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      showToast('Excel report generated successfully!', 'success');
      setIsReportModalOpen(false);
    } catch (error) {
      console.error(error);
      showToast('Failed to generate Excel report', 'error');
    }
  };"""

content = content.replace(old_handle, new_handle)

# 5. Replace Button
old_btn = """        <div style={{ display: 'flex', gap: '1rem', width: '100%', overflowX: 'auto' }}>
          <button onClick={handleExportCSV} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'center' }}>
            <Download size={18} /> Export CSV
          </button>"""

new_btn = """        <div style={{ display: 'flex', gap: '1rem', width: '100%', overflowX: 'auto' }}>
          <button onClick={() => setIsReportModalOpen(true)} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'center' }}>
            <Calendar size={18} /> Generate Report
          </button>"""

content = content.replace(old_btn, new_btn)

# 6. Modal
old_end = """      {portfolioVendor && (
        <VendorPortfolioModal 
          vendorName={portfolioVendor} 
          onClose={() => setPortfolioVendor(null)} 
        />
      )}
    </div>
  );
};"""

new_end = """      {portfolioVendor && (
        <VendorPortfolioModal 
          vendorName={portfolioVendor} 
          onClose={() => setPortfolioVendor(null)} 
        />
      )}

      {isReportModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="glass-panel" style={{ 
            width: '100%',
            maxWidth: '550px', 
            padding: '2.5rem', 
            animation: 'fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.05)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Decorative background glow */}
            <div style={{
              position: 'absolute',
              top: '-50%',
              left: '-50%',
              width: '200%',
              height: '200%',
              background: 'radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.08) 0%, transparent 50%)',
              pointerEvents: 'none',
              zIndex: 0
            }}></div>

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.75rem', display: 'flex', alignItems: 'center', gap: '1rem', margin: 0, fontWeight: 700 }}>
                  <div style={{ background: 'var(--accent-gradient)', padding: '0.75rem', borderRadius: '1rem', color: '#fff', display: 'flex', boxShadow: '0 8px 16px rgba(16, 185, 129, 0.25)' }}>
                    <Calendar size={28} />
                  </div>
                  Generate Report
                </h2>
                <button 
                  onClick={() => setIsReportModalOpen(false)} 
                  style={{ 
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', 
                    color: 'var(--text-secondary)', display: 'flex', padding: '0.75rem',
                    borderRadius: '50%', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                    e.currentTarget.style.color = '#fff';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <X size={20} />
                </button>
              </div>
              
              <p className="text-secondary" style={{ marginBottom: '2rem', fontSize: '1.05rem', lineHeight: 1.6 }}>
                Select a month to generate a comprehensive Excel portfolio of all vendors. This includes capacities, rates, and detailed contract statuses.
              </p>

              {/* Custom Date Picker UI */}
              <div style={{ 
                background: 'rgba(0,0,0,0.2)', 
                borderRadius: '1.25rem', 
                border: '1px solid rgba(255,255,255,0.08)',
                padding: '1.5rem',
                marginBottom: '2.5rem'
              }}>
                {/* Year Selector */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '0 0.5rem' }}>
                  <button 
                    onClick={() => setSelectedYear(y => y - 1)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', padding: '0.5rem', borderRadius: '0.5rem', transition: 'all 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', letterSpacing: '0.05em' }}>{selectedYear}</span>
                  <button 
                    onClick={() => setSelectedYear(y => y + 1)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', padding: '0.5rem', borderRadius: '0.5rem', transition: 'all 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <ChevronRight size={24} />
                  </button>
                </div>

                {/* Month Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                  {MONTHS.map((month, index) => {
                    const isSelected = selectedMonth === index;
                    return (
                      <button
                        key={month}
                        onClick={() => setSelectedMonth(index)}
                        style={{
                          padding: '1rem 0.5rem',
                          borderRadius: '0.75rem',
                          border: isSelected ? '1px solid transparent' : '1px solid rgba(255,255,255,0.05)',
                          background: isSelected ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.03)',
                          color: isSelected ? '#fff' : 'var(--text-secondary)',
                          fontSize: '0.95rem',
                          fontWeight: isSelected ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: isSelected ? '0 8px 16px rgba(16, 185, 129, 0.2)' : 'none',
                        }}
                        onMouseEnter={e => {
                          if (!isSelected) {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                            e.currentTarget.style.color = 'var(--text-primary)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }
                        }}
                      >
                        {month}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button 
                  style={{ 
                    padding: '0.875rem 1.5rem', 
                    borderRadius: 'var(--radius-md)', 
                    background: 'transparent', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    color: '#fff', 
                    fontWeight: 600, 
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }} 
                  onClick={() => setIsReportModalOpen(false)}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  Cancel
                </button>
                <button 
                  className="btn-premium" 
                  onClick={handleExportExcel} 
                  disabled={selectedMonth === null}
                  style={{
                    padding: '0.875rem 2rem',
                    fontSize: '1.05rem',
                    opacity: selectedMonth === null ? 0.5 : 1,
                    cursor: selectedMonth === null ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Download size={20} />
                  Export Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};"""

content = content.replace(old_end, new_end)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done.")
