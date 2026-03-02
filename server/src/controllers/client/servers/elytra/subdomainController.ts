import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../../config/database';
import { ForbiddenError, NotFoundError, AppError } from '../../../../utils/errors';

export async function listSubdomains(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const permissions = req.serverPermissions ?? [];
    const user = req.user!;

    if (!user.rootAdmin && !permissions.includes('allocation.read')) {
      throw new ForbiddenError('Missing permission: allocation.read');
    }

    // Check if server supports subdomains
    const subdomains = await prisma.serverSubdomain.findMany({
      where: { serverId: server.id, isActive: true },
      include: { domain: true },
    });

    const availableDomains = await prisma.domain.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    const currentSubdomain = subdomains[0] ?? null;

    res.json({
      supported: true,
      current_subdomain: currentSubdomain
        ? {
            object: 'server_subdomain',
            attributes: {
              subdomain: currentSubdomain.subdomain,
              domain: currentSubdomain.domain.name,
              domain_id: currentSubdomain.domainId,
              full_domain: `${currentSubdomain.subdomain}.${currentSubdomain.domain.name}`,
              is_active: currentSubdomain.isActive,
            },
          }
        : null,
      available_domains: availableDomains,
    });
  } catch (err) {
    next(err);
  }
}

export async function createSubdomain(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const permissions = req.serverPermissions ?? [];
    const user = req.user!;

    if (!user.rootAdmin && !permissions.includes('allocation.create')) {
      throw new ForbiddenError('Missing permission: allocation.create');
    }

    const { subdomain, domain_id } = req.body;

    if (!subdomain || !domain_id) {
      throw new AppError('Subdomain and domain_id are required.', 422, 'ValidationError');
    }

    const domain = await prisma.domain.findFirst({
      where: { id: domain_id, isActive: true },
    });

    if (!domain) {
      res.status(422).json({ error: 'Selected domain is not available.' });
      return;
    }

    // Delete any existing active subdomains for this server
    const existing = await prisma.serverSubdomain.findMany({
      where: { serverId: server.id, isActive: true },
    });

    if (existing.length > 0) {
      await prisma.serverSubdomain.updateMany({
        where: { serverId: server.id, isActive: true },
        data: { isActive: false },
      });
    }

    // Create the new subdomain
    // In production, this would also create DNS records through SubdomainManagementService
    const newSubdomain = await prisma.serverSubdomain.create({
      data: {
        serverId: server.id,
        domainId: domain_id,
        subdomain: subdomain.toLowerCase(),
        recordType: 'A',
        dnsRecords: {},
        isActive: true,
      },
      include: { domain: true },
    });

    res.status(201).json({
      message: existing.length > 0 ? 'Subdomain replaced successfully.' : 'Subdomain created successfully.',
      subdomain: {
        object: 'server_subdomain',
        attributes: {
          subdomain: newSubdomain.subdomain,
          domain: newSubdomain.domain.name,
          domain_id: newSubdomain.domainId,
          full_domain: `${newSubdomain.subdomain}.${newSubdomain.domain.name}`,
          is_active: newSubdomain.isActive,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function destroySubdomain(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const permissions = req.serverPermissions ?? [];
    const user = req.user!;

    if (!user.rootAdmin && !permissions.includes('allocation.delete')) {
      throw new ForbiddenError('Missing permission: allocation.delete');
    }

    const subdomains = await prisma.serverSubdomain.findMany({
      where: { serverId: server.id, isActive: true },
    });

    if (subdomains.length === 0) {
      res.status(404).json({ error: 'Server does not have any active subdomains.' });
      return;
    }

    // In production, this would also delete DNS records
    await prisma.serverSubdomain.updateMany({
      where: { serverId: server.id, isActive: true },
      data: { isActive: false },
    });

    res.json({ message: 'Subdomain(s) deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

export async function checkAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const server = req.server!;
    const { subdomain, domain_id } = req.body;

    if (!subdomain || !domain_id) {
      throw new AppError('Subdomain and domain_id are required.', 422, 'ValidationError');
    }

    // Validate subdomain format
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(subdomain) || subdomain.length > 63) {
      res.json({ available: false, message: 'Invalid subdomain format.' });
      return;
    }

    const domain = await prisma.domain.findFirst({
      where: { id: domain_id, isActive: true },
    });

    if (!domain) {
      res.status(422).json({ error: 'Selected domain is not available.' });
      return;
    }

    const existing = await prisma.serverSubdomain.findFirst({
      where: {
        domainId: domain_id,
        subdomain: subdomain.toLowerCase(),
        isActive: true,
      },
    });

    res.json({
      available: !existing,
      message: existing ? 'This subdomain is already taken.' : 'This subdomain is available.',
    });
  } catch (err) {
    next(err);
  }
}
