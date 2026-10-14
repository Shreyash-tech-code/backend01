import { Router } from 'express';
import mongoose from 'mongoose';
import { brandRepository, serializeBrand } from '../repositories/brand.js';
import { ValidationError, validateBrandInput } from '../validation/brand.js';
const routeError = (error, response) => {
    if (error instanceof ValidationError)
        return response.status(400).json({ error: error.message, issues: error.issues });
    if (error instanceof mongoose.Error.ValidationError)
        return response.status(400).json({ error: 'Brand profile validation failed.' });
    if (error?.code === 11000)
        return response.status(409).json({ error: 'A brand with this name already exists.' });
    console.error('[vikral-api] Brand request failed:', error);
    return response.status(503).json({ error: 'Brand profile storage is unavailable.' });
};
export function createBrandsRouter(repository = brandRepository) {
    const router = Router();
    router.get('/', async (_request, response) => {
        try {
            response.json({ brands: (await repository.list()).map(serializeBrand) });
        }
        catch (error) {
            routeError(error, response);
        }
    });
    router.post('/', async (request, response) => {
        try {
            response.status(201).json({ brand: serializeBrand(await repository.create(validateBrandInput(request.body))) });
        }
        catch (error) {
            routeError(error, response);
        }
    });
    router.get('/:id', async (request, response) => {
        if (!mongoose.isValidObjectId(request.params.id))
            return response.status(400).json({ error: 'Invalid brand identifier.' });
        try {
            const brand = await repository.findById(request.params.id);
            return brand ? response.json({ brand: serializeBrand(brand) }) : response.status(404).json({ error: 'Brand profile not found.' });
        }
        catch (error) {
            return routeError(error, response);
        }
    });
    router.put('/:id', async (request, response) => {
        if (!mongoose.isValidObjectId(request.params.id))
            return response.status(400).json({ error: 'Invalid brand identifier.' });
        try {
            const brand = await repository.update(request.params.id, validateBrandInput(request.body));
            return brand ? response.json({ brand: serializeBrand(brand) }) : response.status(404).json({ error: 'Brand profile not found.' });
        }
        catch (error) {
            return routeError(error, response);
        }
    });
    router.delete('/:id', async (request, response) => {
        if (!mongoose.isValidObjectId(request.params.id))
            return response.status(400).json({ error: 'Invalid brand identifier.' });
        try {
            return (await repository.delete(request.params.id)) ? response.status(204).send() : response.status(404).json({ error: 'Brand profile not found.' });
        }
        catch (error) {
            return routeError(error, response);
        }
    });
    return router;
}
export default createBrandsRouter();
