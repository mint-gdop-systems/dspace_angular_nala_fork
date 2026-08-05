/**
 * Model representing a Catalogue Report item
 */
export interface CatalogueReportItem {
  /** Row number */
  index: number;

  /** Record type, showing the collection name the item belongs to */
  recordType: string;

  /** Author name */
  author: string;

  /** Title of the item */
  title: string;

  /** Place of publication */
  placeOfPublication: string;

  /** Publisher name */
  publisher: string;

  /** Publication date */
  publicationDate: string;

  /** Classification number */
  classificationNo: string;

  /** Location */
  location: string;

  /** Number of copies */
  noOfCopies: number;

  /** ISBN */
  isbn: string;

  /** Public access status */
  publicAccess: string;

  /** Created date */
  createdDate: string;

  /** Last edited date */
  lastEditedDate: string;
}

/**
 * Model representing the Catalogue Report response
 */
export interface CatalogueReportResponse {
  /** Array of report items */
  items: CatalogueReportItem[];

  /** Total count of items */
  totalCount: number;

  /** Current page */
  page: number;

  /** Page size */
  pageSize: number;
}