export const endpoints = {
  auth: {
    me: '/auth/me',
  },
  apiKeys: {
    list: '/api-keys',
    detail: (apiKeyId: number) => `/api-keys/${apiKeyId}`,
    revoke: (apiKeyId: number) => `/api-keys/${apiKeyId}/revoke`,
  },
  batches: {
    list: '/order-excel-batches',
    detail: (batchId: number) => `/order-excel-batches/${batchId}`,
    validate: (batchId: number) => `/order-excel-batches/${batchId}/validate`,
    confirm: (batchId: number) => `/order-excel-batches/${batchId}/confirm`,
    cancel: (batchId: number) => `/order-excel-batches/${batchId}/cancel`,
    rollback: (batchId: number) => `/order-excel-batches/${batchId}/rollback`,
    validationErrors: (batchId: number) => `/order-excel-batches/${batchId}/validation-errors`,
  },
  orders: '/orders',
  scanLines: '/scan-lines',
  plLines: '/pl-lines',
  labelLines: '/label-lines',
  labelDownloads: '/downloads/labels',
  externalApi: {
    status: '/external-api/status',
  },
  masters: {
    products: '/masters/products',
    productUploads: '/masters/products/uploads',
    storeRoutes: '/masters/store-routes',
    storeRouteUploads: '/masters/store-routes/uploads',
  },
  audit: {
    batches: '/audit/batches',
    apiCalls: '/audit/api-calls',
    downloads: '/audit/downloads',
  },
} as const;
