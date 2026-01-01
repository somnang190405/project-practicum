// Updated import to use named exports
import * as Types from '../types';

export declare const getProducts: () => Promise<Types.Product[]>;
export declare const createProduct: (product: Types.Product) => Promise<void>;
export declare const updateProduct: (id: string, updatedProduct: Partial<Types.Product>) => Promise<void>;
export declare const deleteProduct: (id: string) => Promise<void>;