"use client";

import React, { useState } from "react";
import Dialog from "@mui/material/Dialog";

interface AddRowsDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (quantity: number) => void;
}

export default function AddRowsDialog({ open, onClose, onAdd }: AddRowsDialogProps) {
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(quantity, 10);
    if (!num || num <= 0) {
      setError(true);
      return;
    }
    onAdd(num);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <div className="p-6 bg-white rounded-lg">
        <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
          <h3 className="text-lg font-bold text-gray-800">Add Multiple Rows</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-650 text-xl font-bold cursor-pointer">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase">
              Number of Rows <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                if (e.target.value && parseInt(e.target.value, 10) > 0) setError(false);
              }}
              className={`w-full text-sm font-medium border rounded px-3 py-2 focus:outline-none focus:ring-1 ${
                error
                  ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                  : "border-gray-300 focus:border-gray-400 focus:ring-gray-400"
              }`}
            />
            {error && <span className="text-xs text-red-500">Please enter a valid number</span>}
          </div>

          <div className="border-t border-gray-200 pt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.98]">
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-[#C00000] hover:bg-[#A00000] rounded transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.98]">
              Add Rows
            </button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}