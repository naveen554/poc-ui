import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon, AlertTriangleIcon, CheckCircleIcon, InfoIcon, HistoryIcon, EditIcon, SaveIcon, XIcon } from 'lucide-react';
import { PerformanceGuarantee, getPGDetail, getPGHistory, PGHistoryItem } from '../../services/api';
import { PGHistory } from '../ui/PGHistory';
import { useParams } from 'react-router-dom';

interface PerformanceGuaranteesProps {
  pgs: PerformanceGuarantee[];
}

export function PerformanceGuarantees({ pgs }: PerformanceGuaranteesProps) {
  const { fileId = '' } = useParams();
  const [expandedPG, setExpandedPG] = useState<string | null>(null);
  const [selectedPG, setSelectedPG] = useState<PerformanceGuarantee | null>(null);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [history, setHistory] = useState<PGHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedPG, setEditedPG] = useState<PerformanceGuarantee | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const togglePG = async (pg: PerformanceGuarantee) => {
    if (expandedPG === pg.pg_id) {
      setExpandedPG(null);
      setSelectedPG(null);
      setEditMode(false);
    } else {
      setExpandedPG(pg.pg_id);
      try {
        const detail = await getPGDetail(fileId, pg.pg_id);
        setSelectedPG(detail);
        setEditedPG(detail);
      } catch (error) {
        console.error('Failed to load PG detail:', error);
        setSelectedPG(pg);
        setEditedPG(pg);
      }
    }
  };

  const loadHistory = async (pgId: string) => {
    setHistoryLoading(true);
    setHistoryDrawerOpen(true);
    try {
      const historyData = await getPGHistory(fileId, pgId);
      setHistory(historyData);
    } catch (error) {
      console.error('Failed to load PG history:', error);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleEdit = () => {
    setEditMode(true);
  };

  const handleSave = () => {
    // TODO: Implement save API call
    setEditMode(false);
    if (editedPG) {
      setSelectedPG(editedPG);
    }
  };

  const handleCancel = () => {
    setEditMode(false);
    setEditedPG(selectedPG);
  };

  const getClassificationColor = (classification: string) => {
    if (classification === 'STANDARD') return 'bg-green-100 text-green-800 border-green-200';
    if (classification === 'NON_STANDARD') return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getConfidenceColor = (level: string) => {
    if (level === 'HIGH') return 'text-green-700';
    if (level === 'MEDIUM') return 'text-yellow-700';
    if (level === 'LOW') return 'text-red-700';
    return 'text-gray-700';
  };

  const getValidationIcon = (status: string) => {
    switch (status) {
      case 'PASS':
        return <CheckCircleIcon className="h-4 w-4 text-green-600" />;
      case 'FAIL':
        return <AlertTriangleIcon className="h-4 w-4 text-red-600" />;
      case 'WARN':
        return <AlertTriangleIcon className="h-4 w-4 text-yellow-600" />;
      default:
        return <InfoIcon className="h-4 w-4 text-blue-600" />;
    }
  };

  if (pgs.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-navy-800">Performance Guarantees</h2>
        <p className="text-sm text-gray-500">No performance guarantees found for this contract.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-gray-200 bg-white shadow-sm">
      <div 
        className="flex h-9 shrink-0 items-center gap-2 bg-navy-700 px-3 text-white cursor-pointer hover:bg-navy-800 transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        <button
          type="button"
          className="p-0.5 rounded hover:bg-white/10 transition-colors"
          aria-label={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? (
            <ChevronRightIcon className="h-4 w-4" />
          ) : (
            <ChevronDownIcon className="h-4 w-4" />
          )}
        </button>
        <h2 className="text-[13px] font-semibold">Performance Guarantees ({pgs.length})</h2>
      </div>
      
      {!collapsed && (
        <div className="divide-y divide-gray-200">
        {pgs.map((pg) => {
          const isExpanded = expandedPG === pg.pg_id;
          const validationCounts = {
            pass: pg.pg_validations.filter(v => v.status === 'PASS').length,
            fail: pg.pg_validations.filter(v => v.status === 'FAIL').length,
            warn: pg.pg_validations.filter(v => v.status === 'WARN').length,
            info: pg.pg_validations.filter(v => v.status === 'INFO').length,
          };

          return (
            <div key={pg.pg_record_id} className="hover:bg-gray-50 transition-colors">
              <div className="px-6 py-4">
                <div className="flex items-start gap-4">
                  <button
                    type="button"
                    onClick={() => togglePG(pg)}
                    className="mt-1 rounded p-0.5 text-gray-500 hover:bg-gray-200 transition-colors"
                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    {isExpanded ? (
                      <ChevronDownIcon className="h-5 w-5" />
                    ) : (
                      <ChevronRightIcon className="h-5 w-5" />
                    )}
                  </button>

                  <div 
                    className={`flex-1 min-w-0 ${!isExpanded ? 'cursor-pointer' : ''}`}
                    onClick={() => !isExpanded && togglePG(pg)}
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-navy-700 bg-navy-100 px-2 py-0.5 rounded">
                            {pg.pg_id}
                          </span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${getClassificationColor(pg.classification)}`}>
                            {pg.classification}
                          </span>
                          {isExpanded && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                loadHistory(pg.pg_id);
                              }}
                              className="ml-2 rounded p-1 text-blue-600 hover:bg-blue-100 transition-colors"
                              title="View history"
                            >
                              <HistoryIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        <h3 className="text-[15px] font-semibold text-navy-800 mb-1">
                          {pg.pg_metric_name}
                        </h3>
                        <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                          <span className="bg-gray-100 px-2 py-0.5 rounded">{pg.pg_category}</span>
                          <span className="bg-gray-100 px-2 py-0.5 rounded">{pg.pg_sub_category}</span>
                          <span className="text-gray-500">|</span>
                          <span className="font-medium">{pg.product_line.join(', ')}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          {isExpanded && (
                            editMode ? (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSave();
                                  }}
                                  className="flex items-center gap-1 rounded bg-green-600 px-2 py-1 text-xs font-semibold text-white hover:bg-green-700"
                                >
                                  <SaveIcon className="h-3.5 w-3.5" />
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancel();
                                  }}
                                  className="flex items-center gap-1 rounded bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-300"
                                >
                                  <XIcon className="h-3.5 w-3.5" />
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit();
                                }}
                                className="flex items-center gap-1 rounded bg-navy-700 px-2 py-1 text-xs font-semibold text-white hover:bg-navy-800"
                              >
                                <EditIcon className="h-3.5 w-3.5" />
                                Edit
                              </button>
                            )
                          )}
                        </div>
                        <div className={`text-sm font-semibold ${getConfidenceColor(pg.confidence_level)}`}>
                          {pg.confidence_level} ({parseFloat(pg.confidence_score) * 100}%)
                        </div>
                        <div className="text-xs text-gray-600">
                          Penalty: <span className="font-semibold text-navy-700">{pg.penalty_allocation_pct}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <CheckCircleIcon className="h-3.5 w-3.5 text-green-600" />
                        <span className="text-gray-600">{validationCounts.pass} Pass</span>
                      </div>
                      {validationCounts.fail > 0 && (
                        <div className="flex items-center gap-1">
                          <AlertTriangleIcon className="h-3.5 w-3.5 text-red-600" />
                          <span className="text-gray-600">{validationCounts.fail} Fail</span>
                        </div>
                      )}
                      {validationCounts.warn > 0 && (
                        <div className="flex items-center gap-1">
                          <AlertTriangleIcon className="h-3.5 w-3.5 text-yellow-600" />
                          <span className="text-gray-600">{validationCounts.warn} Warn</span>
                        </div>
                      )}
                      {validationCounts.info > 0 && (
                        <div className="flex items-center gap-1">
                          <InfoIcon className="h-3.5 w-3.5 text-blue-600" />
                          <span className="text-gray-600">{validationCounts.info} Info</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 ml-9 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs font-semibold text-gray-700 mb-2">Performance Standard</h4>
                        <p className="text-xs text-gray-600 whitespace-pre-line bg-gray-50 p-3 rounded border border-gray-200">
                          {pg.performance_standard_text}
                        </p>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-gray-700 mb-2">Evaluation Method</h4>
                        <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded border border-gray-200">
                          {pg.evaluation_method_text || 'Not specified'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-gray-50 p-3 rounded border border-gray-200">
                        <div className="text-xs text-gray-500 mb-1">Threshold</div>
                        <div className="text-sm font-semibold text-navy-800">
                          {pg.threshold_direction} {pg.threshold_value} {pg.threshold_unit}
                        </div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded border border-gray-200">
                        <div className="text-xs text-gray-500 mb-1">Evaluation Period</div>
                        <div className="text-sm font-semibold text-navy-800">{pg.evaluation_period}</div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded border border-gray-200">
                        <div className="text-xs text-gray-500 mb-1">Penalty Type</div>
                        <div className="text-sm font-semibold text-navy-800">{pg.penalty_type}</div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded border border-gray-200">
                        <div className="text-xs text-gray-500 mb-1">Review Status</div>
                        <div className="text-sm font-semibold text-navy-800">{pg.review_status}</div>
                      </div>
                    </div>

                    {pg.classification_reason && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-700 mb-2">Classification Reason</h4>
                        <p className="text-xs text-gray-600 bg-orange-50 p-3 rounded border border-orange-200">
                          {pg.classification_reason}
                        </p>
                      </div>
                    )}

                    {pg.notes && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-700 mb-2">Notes</h4>
                        <p className="text-xs text-gray-600 bg-blue-50 p-3 rounded border border-blue-200">
                          {pg.notes}
                        </p>
                      </div>
                    )}

                    <div>
                      <h4 className="text-xs font-semibold text-gray-700 mb-2">Validations ({pg.pg_validations.length})</h4>
                      <div className="space-y-2">
                        {pg.pg_validations.map((validation, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 p-2 rounded border border-gray-200 bg-gray-50 text-xs"
                          >
                            {getValidationIcon(validation.status)}
                            <div className="flex-1">
                              <div className="font-semibold text-gray-700 mb-0.5">
                                {validation.rule_id} - {validation.status}
                              </div>
                              <div className="text-gray-600">{validation.message}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}

      <PGHistory
        open={historyDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
        title="PG History"
        width="w-[700px]"
      >
        <div className="p-6">
          {historyLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <img 
                  src="/NylLogo.svg" 
                  alt="NYL Logo" 
                  className="h-12 w-12 animate-spin-y"
                />
                <div className="text-sm text-gray-500">Loading history...</div>
              </div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500">No history available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((item, idx) => (
                <div key={item.version_id} className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-navy-800">
                          Version {item.version_number}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                          item.change_action === 'EXTRACTED' ? 'bg-blue-100 text-blue-800' :
                          item.change_action === 'UPDATED' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.change_action}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600">
                        <span className="font-medium">{item.changed_by}</span> • {new Date(item.changed_at).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {item.change_reason && (
                    <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-gray-700">
                      <span className="font-semibold">Reason:</span> {item.change_reason}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-gray-500 mb-1">Category</div>
                      <div className="font-medium text-gray-800">{item.pg_category}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">Sub-Category</div>
                      <div className="font-medium text-gray-800">{item.pg_sub_category}</div>
                    </div>
                    {item.pg_snapshot?.classification && (
                      <div>
                        <div className="text-gray-500 mb-1">Classification</div>
                        <div className={`inline-block px-2 py-0.5 rounded font-semibold ${
                          item.pg_snapshot.classification === 'STANDARD' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {item.pg_snapshot.classification}
                        </div>
                      </div>
                    )}
                    {item.pg_snapshot?.penalty_allocation_percentage && (
                      <div>
                        <div className="text-gray-500 mb-1">Penalty Allocation</div>
                        <div className="font-medium text-gray-800">{item.pg_snapshot.penalty_allocation_percentage}%</div>
                      </div>
                    )}
                  </div>

                  {idx < history.length - 1 && (
                    <div className="mt-4 border-t border-gray-200"></div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </PGHistory>
    </div>
  );
}
