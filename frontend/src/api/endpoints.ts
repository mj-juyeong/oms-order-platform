export const endpoints = {
  auth: {
    me: '/auth/me',
    login: '/auth/login',
    logout: '/auth/logout',
  },
  batches: {
    list: '/order-excel-batches',
    detail: (batchId: string) => `/order-excel-batches/${batchId}`,
    validationErrors: (batchId: string) => `/order-excel-batches/${batchId}/validation-errors`,
  },
  orders: '/orders',
  scanLines: '/scan-lines',
  plLines: '/pl-lines',
  labelLines: '/label-lines',
  labelDownloads: '/downloads/labels',
  masters: {
    productVersions: '/masters/products/versions',
    products: '/masters/products',
    storeRouteVersions: '/masters/store-routes/versions',
    storeRoutes: '/masters/store-routes',
  },
  audit: {
    batches: '/audit/batches',
    apiCalls: '/audit/api-calls',
    downloads: '/audit/downloads',
  },
} as const;
