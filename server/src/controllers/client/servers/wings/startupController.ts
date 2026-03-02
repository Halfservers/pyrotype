import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../../config/database';
import { fractalList, fractalItem } from '../../../../utils/response';
import { NotFoundError, AppError } from '../../../../utils/errors';

function transformVariable(variable: any, serverValue: string | null) {
  return {
    name: variable.name,
    description: variable.description,
    env_variable: variable.envVariable,
    default_value: variable.defaultValue,
    server_value: serverValue,
    is_editable: variable.userEditable,
    rules: variable.rules,
  };
}

function buildStartupCommand(server: any, variables: any[]): string {
  let command = server.startup;
  for (const v of variables) {
    const value = v.serverValue ?? v.variable?.defaultValue ?? '';
    command = command.replace(new RegExp(`\\{\\{${v.variable?.envVariable}\\}\\}`, 'g'), value);
  }
  return command;
}

async function resolveServer(serverId: string): Promise<any> {
  const server = await prisma.server.findFirst({
    where: { OR: [{ uuidShort: serverId }, { uuid: serverId }] },
    include: {
      egg: true,
      serverVariables: { include: { variable: true } },
    },
  });
  if (!server) throw new NotFoundError('Server not found');
  return server;
}

export async function index(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await resolveServer(req.params.server as string);

    const eggVariables = await prisma.eggVariable.findMany({
      where: { eggId: server.eggId, userViewable: true },
    });

    const serverVarMap = new Map<number, string>(
      server.serverVariables.map((sv: any) => [sv.variableId, sv.variableValue]),
    );

    const data = eggVariables.map((v) => transformVariable(v, serverVarMap.get(v.id) ?? null));
    const startupCommand = buildStartupCommand(server, server.serverVariables);

    const result = fractalList('egg_variable', data);
    res.json({
      ...result,
      meta: {
        startup_command: startupCommand,
        docker_images: server.egg?.dockerImages ?? {},
        raw_startup_command: server.startup,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await resolveServer(req.params.server as string);
    const key = req.body.key as string;
    const value = req.body.value as string ?? '';

    const eggVar = await prisma.eggVariable.findFirst({
      where: { eggId: server.eggId, envVariable: key },
    });

    if (!eggVar || !eggVar.userViewable) {
      throw new AppError('The environment variable you are trying to edit does not exist.', 400, 'BadRequest');
    }

    if (!eggVar.userEditable) {
      throw new AppError('The environment variable you are trying to edit is read-only.', 400, 'BadRequest');
    }

    const existingVar = await prisma.serverVariable.findFirst({
      where: { serverId: server.id, variableId: eggVar.id },
    });

    if (existingVar) {
      await prisma.serverVariable.update({
        where: { id: existingVar.id },
        data: { variableValue: value },
      });
    } else {
      await prisma.serverVariable.create({
        data: {
          serverId: server.id,
          variableId: eggVar.id,
          variableValue: value,
        },
      });
    }

    // Re-fetch for updated startup command
    const updatedServer = await resolveServer(req.params.server as string);
    const startupCommand = buildStartupCommand(updatedServer, updatedServer.serverVariables);

    res.json({
      ...fractalItem('egg_variable', transformVariable(eggVar, value)),
      meta: {
        startup_command: startupCommand,
        raw_startup_command: updatedServer.startup,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateCommand(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await resolveServer(req.params.server as string);
    const startup = req.body.startup as string;

    await prisma.server.update({
      where: { id: server.id },
      data: { startup },
    });

    const updatedServer = await resolveServer(req.params.server as string);
    const eggVariables = await prisma.eggVariable.findMany({
      where: { eggId: updatedServer.eggId, userViewable: true },
    });

    const serverVarMap = new Map<number, string>(
      updatedServer.serverVariables.map((sv: any) => [sv.variableId, sv.variableValue]),
    );

    const data = eggVariables.map((v) => transformVariable(v, serverVarMap.get(v.id) ?? null));
    const startupCommand = buildStartupCommand(updatedServer, updatedServer.serverVariables);

    const result = fractalList('egg_variable', data);
    res.json({
      ...result,
      meta: {
        startup_command: startupCommand,
        docker_images: updatedServer.egg?.dockerImages ?? {},
        raw_startup_command: updatedServer.startup,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getDefaultCommand(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await resolveServer(req.params.server as string);
    res.json({ default_startup_command: server.egg?.startup ?? '' });
  } catch (err) {
    next(err);
  }
}

export async function processCommand(req: Request, res: Response, next: NextFunction) {
  try {
    const server = await resolveServer(req.params.server as string);
    const command = (req.body.command as string) ?? server.startup;

    // Replace variables in the provided command
    let processed = command;
    for (const sv of server.serverVariables) {
      const envVar = sv.variable?.envVariable;
      if (envVar) {
        const value = sv.variableValue || sv.variable?.defaultValue || '';
        processed = processed.replace(new RegExp(`\\{\\{${envVar}\\}\\}`, 'g'), value);
      }
    }

    res.json({ processed_command: processed });
  } catch (err) {
    next(err);
  }
}
