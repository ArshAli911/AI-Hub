import { Router, Request, Response } from 'express';
import { getMarketplaceItems, getMarketplaceItemById, createMarketplaceItem, updateMarketplaceItem, deleteMarketplaceItem } from '../controllers/marketplaceController';

const router = Router();

router.get('/', getMarketplaceItems);
router.get('/:id', getMarketplaceItemById);
router.post('/', createMarketplaceItem);
router.put('/:id', updateMarketplaceItem);
router.delete('/:id', deleteMarketplaceItem);

export default router; 