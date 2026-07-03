export interface Attribute {
  id: string;
  name: string;
  columnName: string;
  description: string;
  order: number;
}

export interface SampleRow {
  id: number;
  week: string;
  attributes: Record<string, string>;
  evidence: string;
  result: "Pass" | "Fail" | "";
  comment?: string;
}

export const initialAttributes: Attribute[] = [
  {
    id: "attr1",
    name: "Attribute 1",
    columnName: "Attribute 1",
    description: "Attribute 1",
    order: 2,
  },
  {
    id: "attr2",
    name: "Attribute 2",
    columnName: "Attribute 2",
    description: "Attribute 2",
    order: 3,
  },
  {
    id: "attr3",
    name: "Attribute 3",
    columnName: "Attribute 3",
    description: "Attribute 3",
    order: 4,
  },
];

export const mockSamples: SampleRow[] = [
  {
    id: 1,
    week: "1/11/2026",
    attributes: { attr1: "Pass", attr2: "N/A", attr3: "Pass" },
    evidence: "B",
    result: "Pass",
  },
  {
    id: 2,
    week: "2/15/2026",
    attributes: { attr1: "Pass", attr2: "N/A", attr3: "Pass" },
    evidence: "A",
    result: "Pass",
  },
  {
    id: 3,
    week: "7/20/2025",
    attributes: { attr1: "Pass", attr2: "N/A", attr3: "Pass" },
    evidence: "C",
    result: "Pass",
  },
  {
    id: 4,
    week: "11/23/2025",
    attributes: { attr1: "Pass", attr2: "N/A", attr3: "Pass" },
    evidence: "A",
    result: "Pass",
  },
  {
    id: 5,
    week: "12/28/2025",
    attributes: { attr1: "Pass", attr2: "N/A", attr3: "Pass" },
    evidence: "B",
    result: "Pass",
  },
  {
    id: 6,
    week: "12/29/2025",
    attributes: { attr1: "Pass", attr2: "N/A", attr3: "Pass" },
    evidence: "C",
    result: "Pass",
  },
  {
    id: 7,
    week: "1/05/2026",
    attributes: { attr1: "Pass", attr2: "Fail", attr3: "Pass" },
    evidence: "B",
    result: "Fail",
  },
  {
    id: 8,
    week: "1/12/2026",
    attributes: { attr1: "Pass", attr2: "N/A", attr3: "Pass" },
    evidence: "A",
    result: "Pass",
  },
  {
    id: 9,
    week: "1/19/2026",
    attributes: { attr1: "Fail", attr2: "N/A", attr3: "Fail" },
    evidence: "C",
    result: "Fail",
  },
  {
    id: 10,
    week: "2/02/2026",
    attributes: { attr1: "Pass", attr2: "N/A", attr3: "Pass" },
    evidence: "A",
    result: "Pass",
  },
  {
    id: 11,
    week: "2/09/2026",
    attributes: { attr1: "Pass", attr2: "N/A", attr3: "Pass" },
    evidence: "B",
    result: "Pass",
  },
  {
    id: 12,
    week: "2/23/2026",
    attributes: { attr1: "Pass", attr2: "Pass", attr3: "Pass" },
    evidence: "C",
    result: "Pass",
  },
  {
    id: 13,
    week: "3/02/2026",
    attributes: { attr1: "Pass", attr2: "N/A", attr3: "Pass" },
    evidence: "B",
    result: "Pass",
  },
  {
    id: 14,
    week: "3/09/2026",
    attributes: { attr1: "Fail", attr2: "N/A", attr3: "Pass" },
    evidence: "A",
    result: "Fail",
  },
  {
    id: 15,
    week: "3/16/2026",
    attributes: { attr1: "Pass", attr2: "N/A", attr3: "Pass" },
    evidence: "C",
    result: "Pass",
  },
  {
    id: 16,
    week: "3/23/2026",
    attributes: { attr1: "Pass", attr2: "N/A", attr3: "Pass" },
    evidence: "B",
    result: "Pass",
  },
  {
    id: 17,
    week: "3/30/2026",
    attributes: { attr1: "Pass", attr2: "N/A", attr3: "Pass" },
    evidence: "A",
    result: "Pass",
  },
  {
    id: 18,
    week: "4/06/2026",
    attributes: { attr1: "Pass", attr2: "N/A", attr3: "Fail" },
    evidence: "C",
    result: "Fail",
  },
  {
    id: 19,
    week: "4/13/2026",
    attributes: { attr1: "Pass", attr2: "N/A", attr3: "Pass" },
    evidence: "B",
    result: "Pass",
  },
  {
    id: 20,
    week: "4/20/2026",
    attributes: { attr1: "Pass", attr2: "N/A", attr3: "Pass" },
    evidence: "A",
    result: "Pass",
  },
];
