import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search } from 'lucide-react'

export function SearchableSelect({ 
  options, 
  value, 
  onChange,
  placeholder = "Select..."
}: { 
  options: { value: string, label: string }[], 
  value: string, 
  onChange: (val: string) => void,
  placeholder?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const wrapperRef = useRef<HTMLDivElement>(null)

  const filteredOptions = options.filter(o => 
    o.label.toLowerCase().includes(search.toLowerCase()) || 
    o.value.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div 
        className="w-full border-2 border-black p-2 text-sm font-bold bg-white cursor-pointer flex justify-between items-center rounded"
        onClick={() => { setIsOpen(!isOpen); setSearch("") }}
      >
        <span className="truncate text-gray-700">
          {options.find(o => o.value === value)?.label || <span className="text-gray-400">{placeholder}</span>}
        </span>
        <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0 text-gray-500" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border-2 border-black rounded shadow-lg max-h-60 overflow-y-auto">
          <div className="sticky top-0 bg-white p-2 border-b-2 border-gray-100 z-10">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                autoFocus
                className="w-full pl-8 pr-2 py-1.5 text-sm border-2 border-gray-200 rounded focus:border-black focus:outline-none"
                placeholder="Type to search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="p-1">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-sm text-gray-500 text-center font-medium">No results found</div>
            ) : (
              filteredOptions.map(opt => (
                <div
                  key={opt.value}
                  className={`p-2 px-3 text-sm cursor-pointer hover:bg-gray-100 rounded transition-colors ${value === opt.value ? 'bg-amber-100 font-bold text-amber-900' : 'font-medium text-gray-700'}`}
                  onClick={() => {
                    onChange(opt.value)
                    setIsOpen(false)
                  }}
                >
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
