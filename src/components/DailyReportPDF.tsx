import { useRef, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Download, X, Calendar, User } from 'lucide-react';
import type { Task, Project } from '../types';

interface DailyReportPDFProps {
  project: Project;
  tasks: Task[]; // tasks completed today or in progress
  onClose: () => void;
}

export function DailyReportPDF({ project, tasks, onClose }: DailyReportPDFProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Daily_Report_${project.name}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. See console for details.');
    } finally {
      setIsExporting(false);
    }
  };

  const todayStr = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Preview: Daily Report</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Scrollable Preview Area */}
        <div className="flex-1 overflow-auto bg-gray-100 p-8 flex justify-center relative">
          
          {/* A4 Page Container (Approximate proportions) */}
          <div 
            ref={reportRef} 
            className="bg-white shadow-md mx-auto" 
            style={{ 
              width: '210mm', 
              minHeight: '297mm', 
              padding: '20mm', 
              boxSizing: 'border-box' 
            }}
          >
            {/* Report Header */}
            <div className="border-b-2 border-indigo-600 pb-4 mb-6 text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">DAILY PROGRESS REPORT</h1>
              <h2 className="text-xl font-semibold text-indigo-700">{project.name}</h2>
            </div>
            
            {/* Meta Info */}
            <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
              <div className="flex items-center gap-2 text-gray-700">
                <Calendar className="w-4 h-4 text-indigo-500" />
                <strong>Date:</strong> {todayStr}
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <User className="w-4 h-4 text-indigo-500" />
                <strong>Status:</strong> {project.status}
              </div>
            </div>
            
            {/* Task Progress */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-800 mb-3 border-l-4 border-indigo-500 pl-2">Today's Progress</h3>
              {tasks.length > 0 ? (
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2 text-left">Task Name</th>
                      <th className="border p-2 text-left">Status</th>
                      <th className="border p-2 text-center">Est. Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map(task => (
                      <tr key={task.id}>
                        <td className="border p-2">{task.title}</td>
                        <td className="border p-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            task.status === 'Done' ? 'bg-green-100 text-green-800' : 
                            task.status === 'In Progress' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {task.status}
                          </span>
                        </td>
                        <td className="border p-2 text-center">{task.estimatedHours || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-500 text-sm italic">No tasks recorded for today.</p>
              )}
            </div>
            
            {/* Site Photos */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-800 mb-3 border-l-4 border-indigo-500 pl-2">Site Photos / Attachments</h3>
              <div className="grid grid-cols-2 gap-4">
                {tasks.flatMap(t => t.attachments || []).slice(0, 6).map((img, idx) => (
                  <div key={idx} className="border p-1">
                    <img src={img} alt={`Site photo ${idx}`} className="w-full h-48 object-cover" />
                  </div>
                ))}
              </div>
              {tasks.flatMap(t => t.attachments || []).length === 0 && (
                <p className="text-gray-500 text-sm italic">No photos attached today.</p>
              )}
            </div>
            
            {/* Signatures */}
            <div className="mt-16 pt-8 border-t flex justify-between px-10">
              <div className="text-center">
                <div className="border-b border-gray-400 w-40 mb-2 h-8"></div>
                <p className="text-sm text-gray-600">Prepared By (PM)</p>
              </div>
              <div className="text-center">
                <div className="border-b border-gray-400 w-40 mb-2 h-8"></div>
                <p className="text-sm text-gray-600">Approved By (Client)</p>
              </div>
            </div>
          </div>
          
        </div>
        
        {/* Footer Actions */}
        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={isExporting}
          >
            Cancel
          </button>
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {isExporting ? 'Generating PDF...' : (
              <>
                <Download className="w-4 h-4" />
                Export PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
