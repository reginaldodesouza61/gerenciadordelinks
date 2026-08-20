import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Table as TableIcon } from 'lucide-react';

export function TablePicker({ onSelect }: { onSelect: (rows: number, cols: number) => void }) {
  const [hoveredRow, setHoveredRow] = useState(0);
  const [hoveredCol, setHoveredCol] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (row: number, col: number) => {
    onSelect(row, col);
    setIsOpen(false);
    setHoveredRow(0);
    setHoveredCol(0);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Inserir Tabela">
          <TableIcon size={16} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="flex flex-col items-center">
          <div className="mb-3 text-sm font-medium text-slate-700 bg-slate-100 px-3 py-1 rounded-full w-full text-center">
            {hoveredRow > 0 && hoveredCol > 0 ? `${hoveredRow} x ${hoveredCol} Tabela` : 'Inserir Tabela'}
          </div>
          <div 
            className="grid gap-[2px]" 
            style={{ gridTemplateColumns: 'repeat(10, 1fr)' }}
            onMouseLeave={() => { setHoveredRow(0); setHoveredCol(0); }}
          >
            {Array.from({ length: 10 }).map((_, rowIndex) => (
              Array.from({ length: 10 }).map((_, colIndex) => {
                const row = rowIndex + 1;
                const col = colIndex + 1;
                const isHovered = row <= hoveredRow && col <= hoveredCol;
                return (
                  <div
                    key={`${row}-${col}`}
                    className={`w-5 h-5 border rounded-sm cursor-pointer transition-colors ${isHovered ? 'bg-indigo-500 border-indigo-600' : 'bg-white border-slate-300 hover:border-indigo-400'}`}
                    onMouseEnter={() => { setHoveredRow(row); setHoveredCol(col); }}
                    onClick={() => handleSelect(row, col)}
                  />
                );
              })
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
