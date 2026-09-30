"use client";

import React, { useState } from "react";
import Dialog from "@mui/material/Dialog";
import { Attribute, SampleRow } from "./index";
import { joinEvidenceValues, mergeEvidenceOptions, splitEvidenceValue } from "./evidenceUtils";
import EvidenceMultiSelect from "./EvidenceMultiSelect";

interface EditRowDialogProps {
  open: boolean;
  onClose: () => void;
  row: SampleRow;
  attributes: Attribute[];
  evidenceOptions: string[];
  onSave: (row: SampleRow) => void;
}

export default function EditRowDialog({
  open,
  onClose,
  row,
  attributes,
  evidenceOptions,
  onSave,
}: EditRowDialogProps) {
  const [week, setWeek] = useState(row.week);
  const [evidence, setEvidence] = useState<string[]>(() => splitEvidenceValue(row.evidence));
  const [result, setResult] = useState<"Pass" | "Fail" | "">(row.result);
  const [comment, setComment] = useState(row.comment || "");
  const [attrValues, setAttrValues] = useState<Record<string, string>>(() => {
    const initialValues: Record<string, string> = {};
    attributes.forEach((attr) => {
      initialValues[attr.id] = row.attributes[attr.id] || "";
    });
    return initialValues;
  });
  const [errorWeek, setErrorWeek] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!week.trim()) {
      setErrorWeek(true);
      return;
    }
    onSave({
      ...row,
      week: week.trim(),
      attributes: attrValues,
      evidence: joinEvidenceValues(evidence),
      result,
      comment: comment.trim(),
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <div className="p-6 bg-white rounded-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4 shrink-0">
          <h3 className="text-base font-bold text-gray-800">
            Edit Sample Row (ID: {row.id})
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-650 text-xl font-bold cursor-pointer leading-none p-1 transition-colors">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1">
          {/* Sample ID */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Sample ID <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={2}
              value={week}
              onChange={(e) => {
                setWeek(e.target.value);
                if (e.target.value.trim()) setErrorWeek(false);
              }}
              className={`w-full text-xs font-medium border rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 resize-y ${
                errorWeek
                  ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                  : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              }`}
            />
            {errorWeek && (
              <span className="text-xs text-red-500">
                Sample ID is required
              </span>
            )}
          </div>

          {/* Attributes */}
          {attributes.length > 0 && (
            <div className="border-t border-gray-100 pt-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                Attributes
              </span>
              <div className="flex flex-col gap-3">
                {attributes.map((attr) => (
                  <div key={attr.id} className="flex flex-col gap-1">
                    <label
                      className="text-xs font-semibold text-gray-600 truncate"
                      title={attr.name}>
                      {attr.name}
                    </label>
                    <textarea
                      rows={2}
                      value={attrValues[attr.id] || ""}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                        setAttrValues({
                          ...attrValues,
                          [attr.id]: e.target.value,
                        });
                      }}
                      className="w-full text-xs font-medium border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white resize-y"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Supporting Evidence */}
          <div className="border-t border-gray-100 pt-3 flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Supporting Evidence
            </label>
            <EvidenceMultiSelect
              value={joinEvidenceValues(evidence)}
              options={mergeEvidenceOptions(row.evidence, evidenceOptions)}
              onChange={(nextValue) => setEvidence(nextValue ? nextValue.split(";") : [])}
              label=""
            />
          </div>

          {/* Assessment Result (Pass/Fail) */}
          <div className="border-t border-gray-100 pt-3 flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Assessment Result
            </label>
            <div className="relative w-full">
              <select
                value={result}
                onChange={(e) => setResult(e.target.value as "Pass" | "Fail" | "")}
                style={{ width: "100%", height: "40px", boxSizing: "border-box" }}
                className="w-full h-10 text-xs font-semibold border border-gray-300 rounded px-2.5 bg-white text-gray-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer">
                <option value="Pass" className="text-emerald-700">
                  Pass
                </option>
                <option value="Fail" className="text-red-700">
                  Fail
                </option>
              </select>
            </div>
          </div>

          {/* Comment */}
          <div className="border-t border-gray-100 pt-3 flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Comment
            </label>
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full text-xs font-medium border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white resize-y"
            />
          </div>

          {/* Actions */}
          <div className="border-t border-gray-200 pt-4 flex justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.98]">
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-[#C00000] hover:bg-[#A00000] rounded transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.98]">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}

