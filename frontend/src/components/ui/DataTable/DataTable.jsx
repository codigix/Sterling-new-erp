import React, { useState, useMemo, Fragment } from 'react';
import { ChevronUp, ChevronDown, Loader, Search, X, ChevronRight } from 'lucide-react';

const DataTable = ({
  columns,
  data = [],
  loading = false,
  error = null,
  emptyMessage = 'No data found',
  onRowClick = null,
  sortable = true,
  striped = true,
  hover = true,
  rowClassName = null,
  showSearch = true,
  searchPlaceholder = 'Search...',
  renderRowDetail = null,
  expandableRow = null,
  title = null,
  titleIcon = null,
  titleExtra = null,
  filters = [],
  initialSearchValue = '',
  onSearch = null,
  onFilterChange = null,
  externalFilterValues = null,
  className = '',
}) => {
  const effectiveRenderRowDetail = renderRowDetail || expandableRow;
  const [sortConfig, setSortConfig] = useState(null);
  const [searchQuery, setSearchQuery] = useState(initialSearchValue);
  const [internalFilterValues, setInternalFilterValues] = useState({});
  const [expandedRows, setExpandedRows] = useState(new Set());

  const filterValues = externalFilterValues || internalFilterValues;

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    if (onSearch) onSearch(val);
  };

  const handleFilterChange = (key, val) => {
    const newFilters = { ...filterValues, [key]: val };
    if (!externalFilterValues) {
      setInternalFilterValues(newFilters);
    }
    if (onFilterChange) onFilterChange(newFilters);
  };

  const toggleRow = (rowId) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(rowId)) {
      newExpandedRows.delete(rowId);
    } else {
      newExpandedRows.add(rowId);
    }
    setExpandedRows(newExpandedRows);
  };

  const filteredData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    
    let result = data;

    // Apply basic search
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter((row) => {
        return columns.some((column) => {
          const key = column.key || column.accessor;
          const value = row[key];
          if (value == null) return false;
          return String(value).toLowerCase().includes(lowerQuery);
        });
      });
    }

    // Apply advanced filters
    Object.entries(filterValues).forEach(([colKey, filterValue]) => {
      if (filterValue && filterValue !== 'all') {
        result = result.filter((row) => {
          const rowValue = row[colKey];
          if (rowValue === undefined || rowValue === null) return false;
          return String(rowValue) === String(filterValue);
        });
      }
    });

    return result;
  }, [data, searchQuery, columns, filterValues]);

  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue == null) return 1;
      if (bValue == null) return -1;

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredData, sortConfig]);

  const handleSort = (key) => {
    if (!sortable) return;

    setSortConfig((current) => {
      if (current && current.key === key) {
        return {
          key,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key, direction: 'asc' };
    });
  };



  const getSortIcon = (columnKey) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return null;
    }
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5 ml-1 inline" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 ml-1 inline" />
    );
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {(title || showSearch) && (
        <div className="">
           <div className='flex justify-between'>
            <div className="flex items-center my-2 gap-3">
              {titleIcon && (
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded flex-shrink-0">
                  {React.isValidElement(titleIcon) ? (
                    titleIcon
                  ) : (
                    React.createElement(titleIcon, { size: 18 })
                  )}
                </div>
              )}
              {title && (
                <h2 className="text-xl   dark:text-white  whitespace-nowrap">
                  {title}
                </h2>
              )}
            </div>
             {titleExtra && (
                <div className="flex items-center gap-2 w-full sm:w-auto sm:justify-end">
                  {titleExtra}
                </div>
              )}
           </div>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
           

            <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 lg:justify-end">
              {showSearch && (
                <div className="relative w-full sm:max-w-xs group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={14} />
                  <input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => handleSearchChange("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-400 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              )}

              {filters && filters.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  {filters.map((filter, index) => (
                    <select
                      key={index}
                      value={filterValues[filter.column || filter.key] || "all"}
                      onChange={(e) => handleFilterChange(filter.column || filter.key, e.target.value)}
                      className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                    >
                      <option value="all">All {filter.label}</option>
                      {filter.options.map((option, optIndex) => (
                        <option key={optIndex} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ))}
                </div>
              )}

             
            </div>
          </div>
        </div>
      )}
      <div className="bg-white dark:bg-slate-900  border border-slate-100 dark:border-slate-800 ">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800  dark:bg-slate-800/50">
                {effectiveRenderRowDetail && <th key="expander-header" className="w-10 p-3"></th>}
                {columns.map((column, colIndex) => {
                  const key = column.key || column.accessor;
                  const label = column.label || column.header;
                  return (
                    <th
                      key={key || `col-${colIndex}`}
                      className={`p-2 text-xs text-slate-500 dark:text-slate-400 ${
                        column.align === "right" ? "text-right" : "text-left"
                      } ${
                        column.sortable !== false && sortable && key
                          ? "cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-700/50 select-none transition-colors"
                          : ""
                      }`}
                      onClick={() =>
                        column.sortable !== false && sortable && key && handleSort(key)
                      }
                    >
                      <div className={`flex items-center gap-1 ${column.align === "right" ? "justify-end" : "justify-start"}`}>
                        {label}
                        {column.sortable !== false && sortable && key && (
                          <div className="text-slate-300">
                            {getSortIcon(key)}
                          </div>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={columns.length + (effectiveRenderRowDetail ? 1 : 0)} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs text-slate-500">Loading data...</span>
                    </div>
                  </td>
                </tr>
              ) : sortedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (effectiveRenderRowDetail ? 1 : 0)} className="p-12 text-center text-xs text-slate-400 italic">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                sortedData.map((row, rowIndex) => {
                  const rowId = row.id ?? row._id ?? `row-${rowIndex}`;
                  const isExpanded = expandedRows.has(rowId);
                  return (
                    <Fragment key={rowId}>
                      <tr
                        className={`group transition-colors ${
                          striped && rowIndex % 2 === 1 ? "bg-slate-50/30 dark:bg-slate-800/20" : ""
                        } hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 ${
                          rowClassName ? rowClassName(row, rowIndex) : ""
                        }`}
                        onClick={() => onRowClick?.(row)}
                      >
                        {effectiveRenderRowDetail && (
                          <td className="p-3 text-center w-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRow(rowId);
                              }}
                              className={`p-1 rounded transition-all ${
                                isExpanded
                                  ? "bg-indigo-100 text-indigo-600 rotate-180"
                                  : "text-slate-400 hover:bg-slate-100"
                              }`}
                            >
                              <ChevronDown size={14} />
                            </button>
                          </td>
                        )}
                        {columns.map((column, colIndex) => {
                          const key = column.key || column.accessor;
                          const cellValue = key ? row[key] : undefined;
                          return (
                            <td
                              key={`${rowId}-col-${colIndex}-${key || "no-key"}`}
                              className={`p-3 text-xs text-slate-600 dark:text-slate-300 ${
                                column.align === "right" ? "text-right" : "text-left"
                              } ${column.className || ""}`}
                            >
                              {column.render ? column.render(cellValue, row, sortedData, rowIndex) : (cellValue ?? "-")}
                            </td>
                          );
                        })}
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td
                            colSpan={columns.length + (effectiveRenderRowDetail ? 1 : 0)}
                            className="p-0 border-none"
                          >
                            <div className="bg-slate-50/50 dark:bg-slate-900/50 border-y border-slate-100 dark:border-slate-800 shadow-inner">
                              {effectiveRenderRowDetail(row, rowIndex)}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
