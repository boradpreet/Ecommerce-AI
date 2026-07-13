"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useVendorActivity, VendorCallsView, VendorDataLoading, VendorDataError } from "src/components/superadmin/vendorData";

export default function VendorCallLogsPage() {
  const params = useParams();
  const vendorId = params?.vendorId as string;
  const { data, loading } = useVendorActivity(vendorId);
  if (loading) return <VendorDataLoading />;
  if (!data) return <VendorDataError />;
  return <VendorCallsView data={data} vendorId={vendorId} />;
}
