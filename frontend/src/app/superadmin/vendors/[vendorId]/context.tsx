"use client";

import { createContext, useContext } from "react";
import { VendorDetail } from "src/types/vendor";

export interface VendorDetailContextType {
  vendorDetail: VendorDetail | null;
  loading: boolean;
  refreshDetail: () => Promise<void>;
  handleLocalToggleSuspension: () => Promise<void>;
  updateDetailFields: (updates: Partial<VendorDetail>) => void;
}

export const VendorDetailContext = createContext<VendorDetailContextType | undefined>(undefined);

export const useVendorDetail = () => {
  const context = useContext(VendorDetailContext);
  if (!context) {
    throw new Error("useVendorDetail must be used within a VendorDetailProvider");
  }
  return context;
};
