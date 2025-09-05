import React, { useState, useEffect, useMemo } from 'react';
import { createItem } from '../../api/items';
import { getRooms, createRoom, deleteRoom } from '../../api/households';
import type { Item, Room, ApiResponse } from '../../types/api';

interface DashboardProps {
  userProfile: {
    householdId: string | null;
    displayName: string | null;
  };
  items: Item[];
  onEditItem: (item: Item) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ userProfile, items, onEditItem }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [quickAddRoom, setQuickAddRoom] = useState<Room | null>(null);
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);

  const fetchRoomsData = async () => {
    if (!userProfile.householdId) return;
    try {
      setLoading(true);
      const response = await getRooms(userProfile.householdId);
      if (response.success && response.data) {
        setRooms(response.data);
      } else {
        setError(response.error?.message || 'Failed to fetch rooms.');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomsData();
  }, [userProfile.householdId]);

  const roomItemCounts = useMemo(() => {
    const counts: { [roomId: string]: number } = {};
    for (const room of rooms) {
        counts[room.id] = items.filter(item => item.location.roomId === room.id).length;
    }
    return counts;
  }, [items, rooms]);

  const handleQuickAddItem = async (item: Omit<Item, 'id' | 'creatorUserId' | 'householdId' | 'lastUpdated'>) => {
    try {
      const response: ApiResponse<Item> = await createItem(item);
      if (response.success) {
        setQuickAddRoom(null);
        // Data will be re-fetched by App.tsx due to dashboardKey change
      } else {
        throw new Error(response.error?.message || 'Failed to add item.');
      }
    } catch (err) {
      throw err;
    }
  };

  const handleAddRoom = async (roomName: string, nBins: number) => {
    if (!userProfile.householdId) return;
    try {
      const response = await createRoom(userProfile.householdId, { name: roomName, nBins });
      if (response.success) {
        setShowAddRoomModal(false);
        fetchRoomsData();
      } else {
        throw new Error(response.error?.message || 'Failed to create room.');
      }
    } catch (err) {
      throw err;
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!userProfile.householdId) return;
    try {
      const response = await deleteRoom(userProfile.householdId, roomId);
      if (response.success) {
        fetchRoomsData();
      } else {
        setError(response.error?.message || 'Failed to delete room.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><span className="loading loading-lg"></span></div>;
  }

  if (selectedRoom) {
    return (
      <RoomDetailView 
        room={selectedRoom} 
        items={items.filter(item => item.location.roomId === selectedRoom.id)}
        onBack={() => setSelectedRoom(null)}
        onEditItem={onEditItem}
      />
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-3xl font-bold mb-6">Dashboard</h2>

      {/* Rooms List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {rooms.map(room => (
          <RoomCard 
            key={room.id} 
            room={room} 
            itemCount={roomItemCounts[room.id] || 0} 
            onQuickAdd={() => setQuickAddRoom(room)} 
            onView={() => setSelectedRoom(room)} 
            onDelete={() => handleDeleteRoom(room.id)}
          />
        ))}
        <AddRoomCard onClick={() => setShowAddRoomModal(true)} />
      </div>

      {quickAddRoom && (
        <QuickAddModal 
          room={quickAddRoom}
          onClose={() => setQuickAddRoom(null)}
          onAddItem={handleQuickAddItem}
        />
      )}

      {showAddRoomModal && (
        <AddRoomModal 
          onClose={() => setShowAddRoomModal(false)}
          onAddRoom={handleAddRoom}
        />
      )}
    </div>
  );
};

interface RoomCardProps {
    room: Room;
    itemCount: number;
    onQuickAdd: () => void;
    onView: () => void;
    onDelete: () => void;
}

const RoomCard: React.FC<RoomCardProps> = ({ room, itemCount, onQuickAdd, onView, onDelete }) => {
    return (
        <div className="card bg-base-100 shadow-xl cursor-pointer" onClick={onView}>
            <div className="card-body">
                <button 
                    className="btn btn-xs btn-circle btn-ghost absolute top-2 right-2"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Are you sure you want to delete the room "${room.name}"? This action cannot be undone.`)) {
                            onDelete();
                        }
                    }}
                >
                    ✕
                </button>
                <h3 className="card-title">{room.name}</h3>
                <p>{room.nBins} Bins</p>
                <p>{itemCount} Items</p>
                <div className="card-actions justify-end">
                    <button onClick={(e) => { e.stopPropagation(); onQuickAdd(); }} className="btn btn-primary btn-sm">Quick Add</button>
                </div>
            </div>
        </div>
    );
};

const AddRoomCard: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  return (
    <div className="card bg-base-100 shadow-xl cursor-pointer" onClick={onClick}>
      <div className="card-body flex justify-center items-center">
        <div className="text-5xl">+</div>
        <div className="text-xl">Add Room</div>
      </div>
    </div>
  );
};

interface RoomDetailViewProps {
  room: Room;
  items: Item[];
  onBack: () => void;
  onEditItem: (item: Item) => void;
}

const RoomDetailView: React.FC<RoomDetailViewProps> = ({ room, items, onBack, onEditItem }) => {
  const [selectedBin, setSelectedBin] = useState<number | null>(null);

  const itemsByBin = useMemo(() => {
    const byBin: { [binNumber: number]: Item[] } = {};
    for (const item of items) {
      if (!byBin[item.location.binNumber]) {
        byBin[item.location.binNumber] = [];
      }
      byBin[item.location.binNumber].push(item);
    }
    return byBin;
  }, [items]);

  return (
    <div className="container mx-auto p-4">
      <button onClick={onBack} className="btn btn-ghost mb-4">
        &larr; Back to Dashboard
      </button>
      <h2 className="text-3xl font-bold mb-6">{room.name}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.from({ length: room.nBins }, (_, i) => i + 1).map(binNumber => (
          <div 
            key={binNumber} 
            className={`card bg-base-100 shadow-xl cursor-pointer ${selectedBin === binNumber ? 'border-primary' : ''}`}
            onClick={() => setSelectedBin(binNumber)}
          >
            <div className="card-body">
              <h3 className="card-title">Bin {binNumber}</h3>
              <p>{(itemsByBin[binNumber] || []).length} items</p>
            </div>
          </div>
        ))}
      </div>

      {selectedBin && (
        <div className="mt-8">
          <h3 className="text-2xl font-bold mb-4">Items in Bin {selectedBin}</h3>
          <ul className="list-disc pl-5">
            {(itemsByBin[selectedBin] || []).map(item => (
              <li key={item.id} className="cursor-pointer hover:underline" onClick={() => onEditItem(item)}>
                {item.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

interface QuickAddModalProps {
  room: Room;
  onClose: () => void;
  onAddItem: (item: Omit<Item, 'id' | 'creatorUserId' | 'householdId' | 'lastUpdated'>) => Promise<void>;
}

const QuickAddModal: React.FC<QuickAddModalProps> = ({ room, onClose, onAddItem }) => {
  const [itemName, setItemName] = useState('');
  const [binNumber, setBinNumber] = useState(1);
  const [status, setStatus] = useState<'STORED' | 'OUT'>('STORED');
  const [isPrivate, setIsPrivate] = useState(false);
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!itemName.trim()) {
      setError('Item name cannot be empty.');
      return;
    }
    if (binNumber <= 0 || binNumber > room.nBins) {
      setError(`Bin number must be between 1 and ${room.nBins}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddItem({
        name: itemName,
        location: { roomId: room.id, binNumber },
        status,
        isPrivate,
        metadata: { category, notes },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Add Item to {room.name}</h3>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="form-control">
            <label className="label"><span className="label-text">Item Name</span></label>
            <input type="text" placeholder="e.g., Winter Clothes" className="input input-bordered" value={itemName} onChange={e => setItemName(e.target.value)} />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Bin Number (1-{room.nBins})</span></label>
            <input type="number" min="1" max={room.nBins} className="input input-bordered" value={binNumber} onChange={e => setBinNumber(parseInt(e.target.value, 10))} />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Status</span></label>
            <select className="select select-bordered" value={status} onChange={e => setStatus(e.target.value as 'STORED' | 'OUT')}>
              <option value="STORED">Stored</option>
              <option value="OUT">Out</option>
            </select>
          </div>
          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">Private Item</span> 
              <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} className="checkbox" />
            </label>
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Category</span></label>
            <input type="text" placeholder="e.g., Electronics" className="input input-bordered" value={category} onChange={e => setCategory(e.target.value)} />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Notes</span></label>
            <textarea className="textarea textarea-bordered" placeholder="e.g., In original box" value={notes} onChange={e => setNotes(e.target.value)}></textarea>
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="modal-action">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? <span className="loading loading-spinner"></span> : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface AddRoomModalProps {
  onClose: () => void;
  onAddRoom: (roomName: string, nBins: number) => Promise<void>;
}

const AddRoomModal: React.FC<AddRoomModalProps> = ({ onClose, onAddRoom }) => {
  const [roomName, setRoomName] = useState('');
  const [nBins, setNBins] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!roomName.trim()) {
      setError('Room name cannot be empty.');
      return;
    }
    if (nBins <= 0) {
      setError('Number of bins must be a positive number.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddRoom(roomName, nBins);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Add a New Room</h3>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="form-control">
            <label className="label"><span className="label-text">Room Name</span></label>
            <input type="text" placeholder="e.g., Garage" className="input input-bordered" value={roomName} onChange={e => setRoomName(e.target.value)} />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Number of Bins</span></label>
            <input type="number" min="1" className="input input-bordered" value={nBins} onChange={e => setNBins(parseInt(e.target.value, 10))} />
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="modal-action">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? <span className="loading loading-spinner"></span> : 'Add Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Dashboard;