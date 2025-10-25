import { Router } from 'express';
import { DeliveryController } from '../controllers/deliveryController';
import { requireAuth, requireUserType } from '../middleware/auth';
// import { validateRequest } from '../middleware/validateRequest';

const router = Router();
const deliveryController = new DeliveryController();

// Routes
router.get('/', requireAuth, deliveryController.getDeliveries.bind(deliveryController));
router.get('/:id', requireAuth, deliveryController.getDelivery.bind(deliveryController));
router.put('/:id/status', requireAuth, requireUserType(['DRIVER']), deliveryController.updateDeliveryStatus.bind(deliveryController));
router.get('/:id/tracking', requireAuth, deliveryController.getDeliveryTracking.bind(deliveryController));

export default router;


