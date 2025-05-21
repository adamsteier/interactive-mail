'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
} from '@tanstack/react-table';
import { CampaignLeadData } from '@/types/firestoreConverters'; // Ensure this path is correct
import { useCampaignLeads } from '../hooks/useCampaignLeads';   // Ensure this path is correct
import { FiChevronDown, FiChevronUp, FiMoreVertical } from 'react-icons/fi'; // Example icons

// Augment TanStack Table's ColumnMeta interface to include our custom 'align' property
declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    align?: 'left' | 'center' | 'right';
  }
}

interface LeadTableProps {
  campaignId: string;
}

const columnHelper = createColumnHelper<CampaignLeadData>();

const IndeterminateCheckbox: React.FC<{
  indeterminate?: boolean;
  className?: string;
  checked?: boolean;
  disabled?: boolean;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  title?: string;
}> = ({ indeterminate, className = '', ...rest }) => {
  const ref = useRef<HTMLInputElement>(null!);

  useEffect(() => {
    if (typeof indeterminate === 'boolean') {
      ref.current.indeterminate = indeterminate;
    }
  }, [ref, indeterminate]);

  return (
    <input
      type="checkbox"
      ref={ref}
      className={className + " cursor-pointer"}
      {...rest}
    />
  );
};

const LeadTable: React.FC<LeadTableProps> = ({ campaignId }) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  // For now, selectedRowIds will be local to this component.
  // Later, we might lift this state up or use Zustand/Context for global access if needed by LeadBulkToolbar etc.
  const [rowSelection, setRowSelection] = useState({});

  const { leads, loading, error } = useCampaignLeads(campaignId, {
    // pageSize: 20, // Example: Lower page size for testing pagination later
  });

  const columns = useMemo(() => [
    columnHelper.accessor('id', {
      id: 'select',
      header: ({ table }) => (
        <IndeterminateCheckbox
          className="rounded border-electric-teal/50 text-electric-teal focus:ring-electric-teal/50 bg-cool-gray/20 disabled:opacity-50"
          checked={table.getIsAllRowsSelected()}
          indeterminate={table.getIsSomeRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
          disabled={loading || !leads?.length}
          title={table.getIsAllRowsSelected() ? "Deselect all" : "Select all"}
        />
      ),
      cell: ({ row }) => (
        <IndeterminateCheckbox
          className="rounded border-electric-teal/50 text-electric-teal focus:ring-electric-teal/50 bg-cool-gray/20 disabled:opacity-50"
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onChange={row.getToggleSelectedHandler()}
          title={row.getIsSelected() ? "Deselect row" : "Select row"}
        />
      ),
      enableSorting: false,
      size: 40, // As per your plan
    }),
    columnHelper.accessor('googleBusinessName', {
      header: 'Name',
      cell: info => <span className="font-medium text-off-white truncate">{info.getValue()}</span>,
      size: 250, // flex-2 equivalent, adjust as needed
    }),
    columnHelper.accessor('searchBusinessType', {
      header: 'Type',
      cell: info => (
        <span 
          className="px-2 py-1 text-xs rounded-full bg-electric-teal/20 text-electric-teal truncate"
          style={{ backgroundColor: '#00F0FF20', color: '#00F0FF'}} // Inline style for brand color consistency
        >
          {info.getValue()}
        </span>
      ),
      size: 140,
    }),
    columnHelper.accessor('googleFormattedAddress', {
      header: 'Address',
      cell: info => <span className="text-cool-gray truncate">{info.getValue()}</span>,
      size: 250, // flex-2 equivalent
    }),
    columnHelper.accessor('googleRating', {
      header: () => <span className="block w-full text-right">★ Rating</span>, // Ensure header text is also aligned
      cell: info => <span className="block w-full text-right">{info.getValue() ?? 'N/A'}</span>,
      size: 90, // Increased size slightly
      meta: {
        align: 'right',
      },
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: info => {
        const status = info.getValue();
        // Basic dot + text, can be enhanced later
        let color = 'bg-cool-gray';
        if (status === 'selected' || status === 'autopilot_selected') color = 'bg-electric-teal';
        else if (status === 'found' || status === 'autopilot_found') color = 'bg-neon-magenta/70';
        return (
          <div className="flex items-center">
            <span className={`w-2.5 h-2.5 rounded-full mr-2 ${color}`}></span>
            <span className="capitalize truncate">{status.replace('_', ' ')}</span>
          </div>
        );
      },
      size: 110,
    }),
    columnHelper.display({
      id: 'actions',
      header: () => null, // No header text for actions
      cell: (/* { row } */) => (
        <div className="text-center"> {/* Center the icon */}
          <button 
            className="text-electric-teal/70 hover:text-electric-teal p-1 rounded hover:bg-electric-teal/10"
          >
            <FiMoreVertical size={16} />
          </button>
        </div>
      ),
      size: 40,
      meta: {
        align: 'center', // Center align the actions column content
      }
    }),
  ], [loading, leads]);

  const table = useReactTable({
    data: leads ?? [], // Use empty array as fallback if leads is undefined
    columns,
    state: {
      sorting,
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // debugTable: true, // Uncomment for debugging
  });

  if (loading) {
    return (
      <div className="text-center py-10 text-electric-teal/80">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-teal mx-auto mb-4"></div>
        Loading leads...
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-10 text-neon-magenta">Error loading leads: {error.message}</div>;
  }

  if (!leads || leads.length === 0) {
    return <div className="text-center py-10 text-cool-gray">No leads found for this campaign.</div>;
  }

  return (
    <div className="overflow-x-auto bg-cool-gray/10 border border-electric-teal/20 rounded-lg shadow-md">
      <table className="min-w-full text-sm text-off-white">
        <thead className="bg-cool-gray/20">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th 
                  key={header.id}
                  colSpan={header.colSpan}
                  className={`p-3 font-medium text-electric-teal/80 tracking-wider whitespace-nowrap 
                              ${header.column.columnDef.meta?.align === 'right' ? 'text-right' : 
                                header.column.columnDef.meta?.align === 'center' ? 'text-center' : 'text-left'}`}
                  style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }} 
                >
                  {header.isPlaceholder
                    ? null
                    : (
                      <div
                        className={`flex items-center 
                                   ${header.column.columnDef.meta?.align === 'right' ? 'justify-end' : 
                                     header.column.columnDef.meta?.align === 'center' ? 'justify-center' : 'justify-start'} 
                                   ${header.column.getCanSort() ? 'cursor-pointer select-none' : ''}`}
                        onClick={header.column.getToggleSortingHandler()}
                        title={header.column.getCanSort() ? 'Sort' : undefined}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: <FiChevronUp className="ml-1" size={14} />,
                          desc: <FiChevronDown className="ml-1" size={14} />,
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    )
                  }
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-electric-teal/10">
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className={`hover:bg-cool-gray/30 ${row.getIsSelected() ? 'bg-cool-gray/40' : ''}`}>
              {row.getVisibleCells().map(cell => (
                <td 
                  key={cell.id} 
                  className={`p-3 whitespace-nowrap 
                              ${cell.column.columnDef.meta?.align === 'right' ? 'text-right' : 
                                cell.column.columnDef.meta?.align === 'center' ? 'text-center' : 'text-left'}`}
                  style={{ width: cell.column.getSize() !== 150 ? cell.column.getSize() : undefined }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {/* Pagination can be added here later */}
      {/* <pre>{JSON.stringify(rowSelection, null, 2)}</pre> */}
    </div>
  );
};

export default LeadTable; 