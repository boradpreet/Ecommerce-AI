// Shared types and helpers for the agent catalog (categories & subcategories).
// The shape mirrors the backend `build_catalog_options` response
// (see backend/app/services/agent_catalog_service.py).

export interface CatalogSubcategory {
  name: string;
  is_custom: boolean;
  id?: number;
}

export interface CatalogCategory {
  name: string;
  is_global?: boolean;
  is_custom: boolean;
  subcategories: CatalogSubcategory[];
}

export interface CatalogOptionsResponse {
  categories: CatalogCategory[];
  default_category?: string;
}

// The globally available (built-in) verticals, in display order.
// Must stay in sync with backend GLOBAL_CATEGORIES.
export const GLOBAL_CATEGORIES: string[] = ["Ecommerce", "Healthcare", "Finance"];

// Returns the list of subcategories for a given category name (empty if not found).
export function getSubcategoriesForCategory(
  catalogOptions: CatalogCategory[],
  categoryName: string
): CatalogSubcategory[] {
  const category = catalogOptions.find((c) => c.name === categoryName);
  return category?.subcategories ?? [];
}

// Returns the name of the first subcategory for a given category ("" if none).
export function getFirstSubcategory(
  catalogOptions: CatalogCategory[],
  categoryName: string
): string {
  const subcategories = getSubcategoriesForCategory(catalogOptions, categoryName);
  return subcategories[0]?.name ?? "";
}
