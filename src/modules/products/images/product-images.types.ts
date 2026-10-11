export type NewProductImage = {
  productId: string;
  key: string;
  alt: string | null;
  width: number;
  height: number;
};

export type UploadedImageFile = {
  buffer: Buffer;
};
