import { Vendor, VendorDetail } from "src/types/vendor";
import { apiFetch } from "src/lib/api";

export async function fetchVendors(token: string): Promise<Vendor[]> {
  try {
    const res = await apiFetch<Vendor[]>("/superadmin/vendors", "GET", undefined, token);
    return Array.isArray(res) ? res : [];
  } catch (err) {
    // Re-throw auth errors so the caller (SuperAdminContext) can handle them
    const status = (err as { status?: number })?.status;
    if (status === 401 || status === 403) throw err;
    console.warn("fetchVendors offline/error:", err);
    return [];
  }
}

export async function fetchVendorDetail(vendorId: number, token: string): Promise<VendorDetail> {
  return await apiFetch<VendorDetail>(`/superadmin/vendors/${vendorId}`, "GET", undefined, token);
}
