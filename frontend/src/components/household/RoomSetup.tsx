import React, { useState, useEffect, useCallback } from 'react';
import { getRooms, updateRoom, deleteRoom } from '../../api/households';
import type { Room, ApiError } from '../../types/api';
import { AxiosError } from 'axios';

interface RoomSetupProps {
  householdId: string;
}

const RoomSetup: React.FC<RoomSetupProps> = ({ householdId }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  useEffect(() => {
    fetchRooms();
  }, [householdId, fetchRooms]);

  const fetchRooms = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getRooms(householdId);
      if (response.success && response.data) {
        setRooms(response.data);
      } else {
        setError(response.error?.message || 'Failed to fetch rooms.');
      }
    } catch (err) {
      const axiosError = err as AxiosError;
      const apiError = axiosError.response?.data as ApiError | undefined;
      setError(apiError?.message || axiosError.message || 'Failed to fetch rooms.');
    } finally {
      setIsLoading(false);
    }
  }, [householdId]);

  const handleUpdateRoom = async (room: Room) => {
    setError(null);
    if (!room.name.trim()) {
        setError('Room name cannot be empty.');
        return;
    }
    if (room.nBins <= 0) {
        setError('Number of bins must be a positive number.');
        return;
    }

    try {
      const response = await updateRoom(householdId, room.id, { name: room.name, nBins: room.nBins });
      if (response.success && response.data) {
        setRooms(rooms.map(r => r.id === room.id ? response.data! : r));
        setEditingRoom(null);
      } else {
        setError(response.error?.message || 'Failed to update room.');
      }
    } catch (err) {
      const axiosError = err as AxiosError;
      const apiError = axiosError.response?.data as ApiError | undefined;
      setError(apiError?.message || axiosError.message || 'Failed to update room.');
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    setError(null);
    try {
      const response = await deleteRoom(householdId, roomId);
      if (response.success) {
        setRooms(rooms.filter(r => r.id !== roomId));
      } else {
        setError(response.error?.message || 'Failed to delete room.');
      }
    } catch (err) {
      const axiosError = err as AxiosError;
      const apiError = axiosError.response?.data as ApiError | undefined;
      setError(apiError?.message || axiosError.message || 'Failed to delete room.');
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Manage Rooms</h1>
      {error && <div className="alert alert-error my-4">{error}</div>}

      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Name</th>
              <th>Bins</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map(room => (
              <tr key={room.id}>
                <td>
                  {editingRoom?.id === room.id ? (
                    <input type="text" value={editingRoom.name} onChange={e => setEditingRoom({...editingRoom, name: e.target.value})} className="input input-bordered input-sm" />
                  ) : (
                    room.name
                  )}
                </td>
                <td>
                  {editingRoom?.id === room.id ? (
                    <input type="number" min="1" value={editingRoom.nBins} onChange={e => setEditingRoom({...editingRoom, nBins: parseInt(e.target.value, 10)})} className="input input-bordered input-sm" />
                  ) : (
                    room.nBins
                  )}
                </td>
                <td>
                  {editingRoom?.id === room.id ? (
                    <>
                      <button onClick={() => handleUpdateRoom(editingRoom)} className="btn btn-sm btn-success mr-2">Save</button>
                      <button onClick={() => setEditingRoom(null)} className="btn btn-sm btn-ghost">Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setEditingRoom(room)} className="btn btn-sm btn-info mr-2">Edit</button>
                      <button onClick={() => handleDeleteRoom(room.id)} className="btn btn-sm btn-error">Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RoomSetup;