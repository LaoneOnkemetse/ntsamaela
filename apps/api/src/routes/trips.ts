import { Router } from 'express';
import TripController from '../controllers/tripController';
import { requireAuth, requireUserType } from '../middleware/auth';
// import { validateRequest } from '../middleware/validateRequest';

const router = Router();
const tripController = TripController;

// Routes
router.post('/', requireAuth, requireUserType(['DRIVER']), tripController.createTrip.bind(tripController));
router.get('/', requireAuth, requireUserType(['DRIVER']), tripController.getTrips.bind(tripController));
router.get('/available', requireAuth, tripController.getAvailableTrips.bind(tripController));
router.get('/my-trips', requireAuth, requireUserType(['DRIVER']), tripController.getTripsByDriver.bind(tripController));
router.get('/:id', requireAuth, tripController.getTripById.bind(tripController));
router.put('/:id', requireAuth, requireUserType(['DRIVER']), tripController.updateTrip.bind(tripController));
router.delete('/:id', requireAuth, requireUserType(['DRIVER']), tripController.deleteTrip.bind(tripController));

// Enhanced matching routes
router.get('/matches/package/:packageId', requireAuth, tripController.findMatchesForPackage.bind(tripController));
router.get('/matches/trip/:tripId', requireAuth, tripController.findMatchesForTrip.bind(tripController));
router.get('/matches/optimal', requireAuth, tripController.findOptimalMatchesWithML.bind(tripController));
router.get('/matches/optimal-ml', requireAuth, tripController.findOptimalMatchesWithML.bind(tripController));

export default router;


