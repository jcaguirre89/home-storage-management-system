import React, { useState, useEffect, useRef } from 'react';
import type { Item, Room } from '../../types/api';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: Item[];
  rooms: Room[];
  showSearch: boolean;
  setShowSearch: (show: boolean) => void;
  onEditItem: (item: Item) => void;
}

const Header: React.FC<HeaderProps> = ({ searchQuery, setSearchQuery, searchResults, rooms, showSearch, setShowSearch, onEditItem }) => {
  const [showResults, setShowResults] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  const getRoomName = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    return room ? room.name : 'Unknown Room';
  };

  return (
    <div className="navbar bg-base-100">
      <div className="navbar-start">
        <label htmlFor="my-drawer" className="btn btn-square btn-ghost drawer-button">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-5 h-5 stroke-current"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
        </label>
      </div>
      <div className="navbar-end">
        <div className="form-control">
          {showSearch && (
            <div className="dropdown dropdown-end">
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder="Search..." 
                className="input input-bordered" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowResults(true)}
                onBlur={() => setTimeout(() => setShowResults(false), 200)} // Delay to allow click on results
                tabIndex={0}
              />
              {showResults && searchResults.length > 0 && (
                <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-200 rounded-box w-64 mt-2">
                  {searchResults.map(item => (
                    <li key={item.id} onClick={() => onEditItem(item)}>
                      <a>
                        <div>{item.name}</div>
                        <div className="text-xs text-gray-500">
                          {item.metadata?.category && <span>{item.metadata.category} - </span>}
                          {getRoomName(item.location.roomId)}, Bin {item.location.binNumber}
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <button className="btn btn-ghost btn-circle" onClick={() => setShowSearch(!showSearch)}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </button>
      </div>
    </div>
  );
};

export default Header;
