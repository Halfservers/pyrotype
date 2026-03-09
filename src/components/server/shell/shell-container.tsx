import { Box, AlertTriangle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Spinner from '@/components/elements/spinner';

import { useServerStore } from '@/store/server';
import { useServerStartupQuery } from '@/lib/queries';
import { api } from '@/lib/http';
import { getGlobalDaemonType } from '@/lib/api/server/get-server';

// Types
interface Egg {
  object: string;
  attributes: {
    id: number;
    uuid: string;
    name: string;
    description: string;
  };
}

interface Nest {
  object: string;
  attributes: {
    id: number;
    uuid: string;
    author: string;
    name: string;
    description: string;
    created_at: string;
    updated_at: string;
    relationships: {
      eggs: {
        object: string;
        data: Egg[];
      };
    };
  };
}

interface EggPreviewVariable {
  env_variable: string;
  name: string;
  description: string;
  default_value: string;
  user_editable: boolean;
  rules: string;
}

interface EggPreviewWarning {
  type: string;
  message: string;
  severity: 'warning' | 'error';
}

interface EggPreview {
  egg: { startup: string };
  docker_images: Record<string, string>;
  default_docker_image: string;
  variables: EggPreviewVariable[];
  warnings?: EggPreviewWarning[];
}

const MAX_DESCRIPTION_LENGTH = 150;
const hidden_nest_prefix = '!';
const blank_egg_prefix = '@';

type FlowStep = 'overview' | 'select-game' | 'select-software' | 'configure' | 'review';

// API calls
const getNests = async (): Promise<Nest[]> => {
  const data = await api.get<any>(`/api/client/servers/${getGlobalDaemonType()}/nests`);
  return data.data || [];
};

const previewEggChange = async (uuid: string, eggId: number, nestId: number): Promise<EggPreview> => {
  const data = await api.get<EggPreview>(
    `/api/client/servers/${getGlobalDaemonType()}/${uuid}/egg-change/preview`,
    { egg_id: eggId, nest_id: nestId },
  );
  return data;
};

const applyEggChange = async (uuid: string, params: Record<string, unknown>): Promise<{ operation_id: string }> => {
  return api.post<{ operation_id: string }>(
    `/api/client/servers/${getGlobalDaemonType()}/${uuid}/egg-change`,
    params,
  );
};

const applyEggChangeSync = async (uuid: string, params: Record<string, unknown>): Promise<void> => {
  await api.post(
    `/api/client/servers/${getGlobalDaemonType()}/${uuid}/egg-change/sync`,
    params,
  );
};

// Validation
const validateEnvironmentVariables = (variables: EggPreviewVariable[], pendingVariables: Record<string, string>): string[] => {
  const errors: string[] = [];

  variables.forEach((variable) => {
    if (!variable.user_editable) return;

    const value = pendingVariables[variable.env_variable] || '';
    const ruleArray = variable.rules
      .split('|')
      .map((rule) => rule.trim())
      .filter((rule) => rule.length > 0);

    const isRequired = ruleArray.includes('required');
    const isNullable = ruleArray.includes('nullable') || !isRequired;

    if (isRequired && (!value || value.trim() === '')) {
      errors.push(`${variable.name} is required.`);
      return;
    }

    if (isNullable && (!value || value.trim() === '')) return;

    ruleArray.forEach((rule) => {
      const [ruleName, ruleValue] = rule.split(':');
      switch (ruleName) {
        case 'integer':
        case 'numeric':
          if (value && isNaN(Number(value))) errors.push(`${variable.name} must be a number.`);
          break;
        case 'min':
          if (ruleValue && value && value.length < parseInt(ruleValue))
            errors.push(`${variable.name} must be at least ${ruleValue} characters.`);
          break;
        case 'max':
          if (ruleValue && value && value.length > parseInt(ruleValue))
            errors.push(`${variable.name} may not be greater than ${ruleValue} characters.`);
          break;
        case 'in':
          if (ruleValue && value) {
            const allowed = ruleValue.split(',').map((v) => v.trim());
            if (!allowed.includes(value)) errors.push(`${variable.name} must be one of: ${allowed.join(', ')}.`);
          }
          break;
      }
    });
  });

  return errors;
};

const ShellContainer = () => {
  const serverData = useServerStore((state) => state.server);
  const daemonType = getGlobalDaemonType();
  const uuid = serverData?.uuid;

  const [nests, setNests] = useState<Nest[]>();
  const currentEgg = serverData?.egg;

  const currentEggName = useMemo(() => {
    if (!nests || !currentEgg) return undefined;
    const foundNest = nests.find((nest) =>
      nest?.attributes?.relationships?.eggs?.data?.find((egg) => egg?.attributes?.uuid === currentEgg),
    );
    return foundNest?.attributes?.relationships?.eggs?.data?.find((egg) => egg?.attributes?.uuid === currentEgg)
      ?.attributes?.name;
  }, [nests, currentEgg]);

  const backupLimit = serverData?.featureLimits.backups;

  const { data: startupData } = useServerStartupQuery(serverData?.id || '');

  // Flow state
  const [currentStep, setCurrentStep] = useState<FlowStep>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNest, setSelectedNest] = useState<Nest | null>(null);
  const [selectedEgg, setSelectedEgg] = useState<Egg | null>(null);
  const [eggPreview, setEggPreview] = useState<EggPreview | null>(null);
  const [pendingVariables, setPendingVariables] = useState<Record<string, string>>({});
  const [variableErrors, setVariableErrors] = useState<Record<string, string>>({});
  const [showWipeConfirmation, setShowWipeConfirmation] = useState(false);
  const [wipeCountdown, setWipeCountdown] = useState(5);
  const [showFullDescriptions, setShowFullDescriptions] = useState<Record<string, boolean>>({});

  // Configuration options
  const [shouldBackup, setShouldBackup] = useState(false);
  const [shouldWipe, setShouldWipe] = useState(false);
  const [customStartup, setCustomStartup] = useState('');
  const [selectedDockerImage, setSelectedDockerImage] = useState('');

  useEffect(() => {
    getNests().then(setNests).catch(console.error);
  }, []);

  useEffect(() => {
    if (backupLimit !== undefined) {
      setShouldBackup(backupLimit !== 0);
    }
  }, [backupLimit]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (showWipeConfirmation && wipeCountdown > 0) {
      interval = setInterval(() => setWipeCountdown((prev) => prev - 1), 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [showWipeConfirmation, wipeCountdown]);

  useEffect(() => {
    if (showWipeConfirmation) setWipeCountdown(5);
  }, [showWipeConfirmation]);

  const resetFlow = () => {
    setCurrentStep('overview');
    setSelectedNest(null);
    setSelectedEgg(null);
    setEggPreview(null);
    setPendingVariables({});
    setVariableErrors({});
    setShouldBackup(backupLimit !== 0);
    setShouldWipe(false);
    setCustomStartup('');
    setSelectedDockerImage('');
  };

  const handleNestSelection = (nest: Nest) => {
    setSelectedNest(nest);
    setSelectedEgg(null);
    setEggPreview(null);
    setPendingVariables({});
    setVariableErrors({});
    setCustomStartup('');
    setSelectedDockerImage('');
    setCurrentStep('select-software');
  };

  const handleEggSelection = async (egg: Egg) => {
    if (!selectedNest || !uuid) return;
    setIsLoading(true);
    setSelectedEgg(egg);

    try {
      const preview = await previewEggChange(uuid, egg.attributes.id, selectedNest.attributes.id);
      setEggPreview(preview);

      if (preview.warnings?.length) {
        const subdomainWarning = preview.warnings.find((w) => w.type === 'subdomain_incompatible');
        if (subdomainWarning) toast.error(subdomainWarning.message, { duration: 8000 });
      }

      const initialVariables: Record<string, string> = {};
      preview.variables.forEach((variable) => {
        const existingVar = startupData?.variables.find((v) => v.envVariable === variable.env_variable);
        initialVariables[variable.env_variable] = existingVar?.serverValue || variable.default_value || '';
      });
      setPendingVariables(initialVariables);
      setCustomStartup(preview.egg.startup);

      const availableDisplayNames = Object.keys(preview.docker_images || {});
      if (preview.default_docker_image && availableDisplayNames.includes(preview.default_docker_image)) {
        setSelectedDockerImage(preview.default_docker_image);
      } else if (availableDisplayNames.length > 0 && availableDisplayNames[0]) {
        setSelectedDockerImage(availableDisplayNames[0]);
      }

      setCurrentStep('configure');
    } catch (error) {
      console.error(error);
      toast.error('Failed to load software preview');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVariableChange = (envVariable: string, value: string) => {
    setPendingVariables((prev) => ({ ...prev, [envVariable]: value }));
    if (eggPreview) {
      const variable = eggPreview.variables.find((v) => v.env_variable === envVariable);
      if (variable) {
        const errors = validateEnvironmentVariables([variable], { [envVariable]: value });
        setVariableErrors((prev) => {
          const newErrors = { ...prev };
          if (errors.length > 0 && errors[0]) newErrors[envVariable] = errors[0];
          else delete newErrors[envVariable];
          return newErrors;
        });
      }
    }
  };

  const executeApplyChanges = async () => {
    if (!selectedEgg || !selectedNest || !eggPreview || !uuid) return;
    setIsLoading(true);

    try {
      const validationErrors = validateEnvironmentVariables(eggPreview.variables, pendingVariables);
      if (validationErrors.length > 0) throw new Error(`Validation failed:\n${validationErrors.join('\n')}`);

      const actualDockerImage =
        selectedDockerImage && eggPreview.docker_images
          ? eggPreview.docker_images[selectedDockerImage]
          : eggPreview.default_docker_image && eggPreview.docker_images
            ? eggPreview.docker_images[eggPreview.default_docker_image]
            : '';

      const filteredEnvironment: Record<string, string> = {};
      Object.entries(pendingVariables).forEach(([key, value]) => {
        if (value && value.trim() !== '') filteredEnvironment[key] = value;
      });

      const payload = {
        egg_id: selectedEgg.attributes.id,
        nest_id: selectedNest.attributes.id,
        docker_image: actualDockerImage,
        startup_command: customStartup,
        environment: filteredEnvironment,
        should_backup: shouldBackup,
        should_wipe: shouldWipe,
      };

      if (daemonType?.toLowerCase() === 'elytra') {
        await applyEggChange(uuid, payload);
      } else {
        await applyEggChangeSync(uuid, payload);
      }

      toast.success('Software change operation started successfully');
      resetFlow();
    } catch (error) {
      console.error('Failed to start egg change operation:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to apply changes');
    } finally {
      setIsLoading(false);
    }
  };

  const applyChanges = async () => {
    if (shouldWipe && !shouldBackup) {
      setShowWipeConfirmation(true);
      return;
    }
    executeApplyChanges();
  };

  const toggleDescription = (id: string) => {
    setShowFullDescriptions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderDescription = (description: string, id: string) => {
    const isLong = description.length > MAX_DESCRIPTION_LENGTH;
    const showFull = showFullDescriptions[id];

    return (
      <p className='text-sm text-neutral-400 leading-relaxed'>
        {isLong && !showFull ? (
          <>
            {description.slice(0, MAX_DESCRIPTION_LENGTH)}...{' '}
            <button onClick={() => toggleDescription(id)} className='text-blue-400 hover:underline font-medium'>Show more</button>
          </>
        ) : (
          <>
            {description}
            {isLong && (
              <> <button onClick={() => toggleDescription(id)} className='text-blue-400 hover:underline font-medium'>Show less</button></>
            )}
          </>
        )}
      </p>
    );
  };

  if (!serverData) {
    return (
      <div className='flex items-center justify-center h-64'>
        <Spinner size='large' centered />
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-bold text-neutral-100'>Software Management</h2>
        <p className='text-sm text-neutral-400 leading-relaxed mt-1'>
          Change your server&apos;s game or software with our guided configuration wizard
        </p>
      </div>

      {/* Progress indicator */}
      {currentStep !== 'overview' && (
        <div className='p-4 bg-[#ffffff08] border border-[#ffffff12] rounded-lg'>
          <div className='flex items-center justify-between mb-2'>
            <span className='text-sm font-medium text-neutral-200 capitalize'>{currentStep.replace('-', ' ')}</span>
            <span className='text-sm text-neutral-400'>
              Step {['overview', 'select-game', 'select-software', 'configure', 'review'].indexOf(currentStep)} of 4
            </span>
          </div>
          <div className='w-full bg-[#ffffff12] rounded-full h-2'>
            <div
              className='bg-blue-500 h-2 rounded-full transition-all duration-300'
              style={{ width: `${(['overview', 'select-game', 'select-software', 'configure', 'review'].indexOf(currentStep) / 4) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Overview */}
      {currentStep === 'overview' && (
        <div className='bg-[#ffffff09] border border-[#ffffff11] rounded-2xl p-6'>
          <h3 className='text-lg font-semibold text-neutral-200 mb-4'>Current Software</h3>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
            <div className='flex items-center gap-3 sm:gap-4 min-w-0 flex-1'>
              <div className='w-10 h-10 sm:w-12 sm:h-12 bg-[#ffffff11] rounded-lg flex items-center justify-center flex-shrink-0'>
                <Box className='w-5 h-5 sm:w-6 sm:h-6 text-neutral-300' />
              </div>
              <div className='min-w-0 flex-1'>
                {currentEggName ? (
                  currentEggName.includes(blank_egg_prefix) ? (
                    <p className='text-amber-400 font-medium text-sm sm:text-base'>No software selected</p>
                  ) : (
                    <p className='text-neutral-200 font-medium text-sm sm:text-base truncate'>{currentEggName}</p>
                  )
                ) : (
                  <div className='flex items-center gap-2'>
                    <Spinner size='small' />
                    <span className='text-neutral-400 text-sm'>Loading...</span>
                  </div>
                )}
                <p className='text-xs sm:text-sm text-neutral-400'>Manage your server&apos;s game or software configuration</p>
              </div>
            </div>
            <Button onClick={() => setCurrentStep('select-game')} disabled={isLoading}>
              Change Software
            </Button>
          </div>
        </div>
      )}

      {/* Select Game */}
      {currentStep === 'select-game' && (
        <div className='bg-[#ffffff09] border border-[#ffffff11] rounded-2xl p-6'>
          <h3 className='text-lg font-semibold text-neutral-200 mb-4'>Select Category</h3>
          <p className='text-sm text-neutral-400 mb-4'>Choose the type of game or software you want to run</p>
          <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4'>
            {nests?.map((nest) =>
              nest?.attributes?.name?.includes(hidden_nest_prefix) ? null : (
                <button
                  key={nest?.attributes?.uuid}
                  onClick={() => handleNestSelection(nest)}
                  className='p-4 sm:p-5 bg-[#ffffff08] border border-[#ffffff12] rounded-lg hover:border-[#ffffff20] transition-all text-left'
                >
                  <h3 className='font-semibold text-neutral-200 mb-2 text-base sm:text-lg'>{nest?.attributes?.name}</h3>
                  {renderDescription(nest?.attributes?.description || '', `nest-${nest?.attributes?.uuid}`)}
                </button>
              ),
            )}
          </div>
          <div className='flex justify-center pt-4'>
            <Button variant='outline' onClick={() => setCurrentStep('overview')}>Back to Overview</Button>
          </div>
        </div>
      )}

      {/* Select Software */}
      {currentStep === 'select-software' && (
        <div className='bg-[#ffffff09] border border-[#ffffff11] rounded-2xl p-6'>
          <h3 className='text-lg font-semibold text-neutral-200 mb-4'>Select Software - {selectedNest?.attributes.name}</h3>
          <p className='text-sm text-neutral-400 mb-4'>Choose the specific software version for your server</p>
          {isLoading ? (
            <div className='flex items-center justify-center py-16'>
              <Spinner size='large' centered />
            </div>
          ) : (
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4'>
              {selectedNest?.attributes?.relationships?.eggs?.data?.map((egg) => (
                <button
                  key={egg.attributes.uuid}
                  onClick={() => handleEggSelection(egg)}
                  disabled={isLoading}
                  className='p-4 bg-[#ffffff08] border border-[#ffffff12] rounded-lg hover:border-[#ffffff20] transition-all text-left disabled:opacity-50'
                >
                  <div className='flex items-center gap-2 mb-2'>
                    {isLoading && selectedEgg?.attributes?.uuid === egg?.attributes?.uuid && <Spinner size='small' />}
                    <h3 className='font-semibold text-neutral-200 text-sm sm:text-base'>{egg?.attributes?.name}</h3>
                  </div>
                  {renderDescription(egg?.attributes?.description || '', `egg-${egg?.attributes?.uuid}`)}
                </button>
              ))}
            </div>
          )}
          <div className='flex flex-col sm:flex-row justify-center gap-3 pt-4'>
            <Button variant='outline' onClick={() => setCurrentStep('select-game')}>Back to Games</Button>
            <Button variant='outline' onClick={() => setCurrentStep('overview')}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Configure */}
      {currentStep === 'configure' && eggPreview && (
        <div className='bg-[#ffffff09] border border-[#ffffff11] rounded-2xl p-6 space-y-6'>
          <h3 className='text-lg font-semibold text-neutral-200'>Configure {selectedEgg?.attributes.name}</h3>

          <div className='space-y-4'>
            <h4 className='text-base font-semibold text-neutral-200'>Software Configuration</h4>
            <div className='grid grid-cols-1 xl:grid-cols-2 gap-4'>
              <div>
                <label className='text-sm font-medium text-neutral-300 block mb-2'>Startup Command</label>
                <textarea
                  value={customStartup}
                  onChange={(e) => setCustomStartup(e.target.value)}
                  placeholder='Enter custom startup command...'
                  rows={3}
                  className='w-full px-3 py-2 bg-[#ffffff08] border border-[#ffffff12] rounded-lg text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-blue-500 transition-colors font-mono resize-none'
                />
              </div>
              <div>
                <label className='text-sm font-medium text-neutral-300 block mb-2'>Docker Image</label>
                {eggPreview.docker_images && Object.keys(eggPreview.docker_images).length > 1 ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className='w-full px-3 py-2 bg-[#ffffff08] border border-[#ffffff12] rounded-lg text-sm text-neutral-200 text-left flex items-center justify-between hover:border-[#ffffff20]'>
                        <span className='truncate'>{selectedDockerImage || 'Select image...'}</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className='min-w-[300px]'>
                      <DropdownMenuRadioGroup value={selectedDockerImage} onValueChange={setSelectedDockerImage}>
                        {Object.entries(eggPreview.docker_images).map(([displayName]) => (
                          <DropdownMenuRadioItem key={displayName} value={displayName} className='text-sm font-mono'>
                            {displayName}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <div className='w-full px-3 py-2 bg-[#ffffff08] border border-[#ffffff12] rounded-lg text-sm text-neutral-200'>
                    {(eggPreview.docker_images && Object.keys(eggPreview.docker_images)[0]) || 'Default Image'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {eggPreview.variables.length > 0 && (
            <div className='space-y-4'>
              <h4 className='text-base font-semibold text-neutral-200'>Environment Variables</h4>
              <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
                {eggPreview.variables.map((variable) => (
                  <div key={variable.env_variable} className='space-y-3'>
                    <div>
                      <label className='text-sm font-medium text-neutral-200 block mb-1'>
                        {variable.name}
                        {!variable.user_editable && (
                          <span className='ml-2 px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded'>Read-only</span>
                        )}
                        {variable.user_editable && variable.rules.includes('required') && (
                          <span className='ml-2 px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded'>Required</span>
                        )}
                      </label>
                      {variable.description && <p className='text-xs text-neutral-400 mb-2'>{variable.description}</p>}
                    </div>
                    {variable.user_editable ? (
                      <div>
                        <input
                          type='text'
                          value={pendingVariables[variable.env_variable] || ''}
                          onChange={(e) => handleVariableChange(variable.env_variable, e.target.value)}
                          placeholder={variable.default_value || 'Enter value...'}
                          className={`w-full px-3 py-2 bg-[#ffffff08] border rounded-lg text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none transition-colors ${
                            variableErrors[variable.env_variable] ? 'border-red-500' : 'border-[#ffffff12] focus:border-blue-500'
                          }`}
                        />
                        {variableErrors[variable.env_variable] && (
                          <p className='text-xs text-red-400 mt-1'>{variableErrors[variable.env_variable]}</p>
                        )}
                      </div>
                    ) : (
                      <div className='w-full px-3 py-2 bg-[#ffffff04] border border-[#ffffff08] rounded-lg text-sm text-neutral-300 font-mono'>
                        {pendingVariables[variable.env_variable] || variable.default_value || 'Not set'}
                      </div>
                    )}
                    <div className='flex justify-between text-xs'>
                      <span className='text-neutral-500 font-mono'>{variable.env_variable}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className='space-y-4'>
            <h4 className='text-base font-semibold text-neutral-200'>Safety Options</h4>
            <div className='space-y-3'>
              <div className='flex items-center justify-between p-4 bg-[#ffffff08] border border-[#ffffff12] rounded-lg'>
                <div className='flex-1 min-w-0 pr-4'>
                  <label className='text-sm font-medium text-neutral-200 block mb-1'>Create Backup</label>
                  <p className='text-xs text-neutral-400'>Automatically create a backup before applying changes</p>
                </div>
                <Switch checked={shouldBackup} onCheckedChange={setShouldBackup} disabled={backupLimit === 0} />
              </div>
              <div className='flex items-center justify-between p-4 bg-[#ffffff08] border border-[#ffffff12] rounded-lg'>
                <div className='flex-1 min-w-0 pr-4'>
                  <label className='text-sm font-medium text-neutral-200 block mb-1'>Wipe Files</label>
                  <p className='text-xs text-neutral-400'>Delete all files before installing new software</p>
                </div>
                <Switch checked={shouldWipe} onCheckedChange={setShouldWipe} />
              </div>
            </div>
          </div>

          <div className='flex flex-col sm:flex-row justify-center gap-3 pt-4'>
            <Button variant='outline' onClick={() => setCurrentStep('select-software')}>Back to Software</Button>
            <Button onClick={() => setCurrentStep('review')} disabled={!eggPreview || isLoading}>Review Changes</Button>
          </div>
        </div>
      )}

      {/* Review */}
      {currentStep === 'review' && selectedEgg && eggPreview && (
        <div className='bg-[#ffffff09] border border-[#ffffff11] rounded-2xl p-6 space-y-6'>
          <h3 className='text-lg font-semibold text-neutral-200'>Review Changes</h3>

          <div className='p-4 bg-[#ffffff08] border border-[#ffffff12] rounded-lg'>
            <h4 className='text-base font-semibold text-neutral-200 mb-4'>Change Summary</h4>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm'>
              <div>
                <span className='text-neutral-400'>From:</span>
                <div className='text-neutral-200 font-medium'>{currentEggName || 'No software'}</div>
              </div>
              <div>
                <span className='text-neutral-400'>To:</span>
                <div className='text-blue-400 font-medium'>{selectedEgg.attributes.name}</div>
              </div>
              <div>
                <span className='text-neutral-400'>Category:</span>
                <div className='text-neutral-200 font-medium'>{selectedNest?.attributes.name}</div>
              </div>
              <div>
                <span className='text-neutral-400'>Docker Image:</span>
                <div className='text-neutral-200 font-medium'>{selectedDockerImage || 'Default'}</div>
              </div>
            </div>
          </div>

          {eggPreview.variables.length > 0 && (
            <div className='p-4 bg-[#ffffff08] border border-[#ffffff12] rounded-lg'>
              <h4 className='text-base font-semibold text-neutral-200 mb-4'>Variable Configuration</h4>
              <div className='space-y-2'>
                {eggPreview.variables.map((variable) => (
                  <div key={variable.env_variable} className='flex justify-between items-center py-2 px-3 bg-[#ffffff08] rounded-lg'>
                    <div>
                      <span className='text-neutral-200 font-medium'>{variable.name}</span>
                      <span className='text-neutral-500 text-sm ml-2 font-mono'>({variable.env_variable})</span>
                    </div>
                    <div className='text-blue-400 font-mono text-sm'>
                      {pendingVariables[variable.env_variable] || variable.default_value || 'Not set'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className='p-4 bg-[#ffffff08] border border-[#ffffff12] rounded-lg'>
            <h4 className='text-base font-semibold text-neutral-200 mb-4'>Safety Options</h4>
            <div className='space-y-2'>
              <div className='flex justify-between items-center py-2 px-3 bg-[#ffffff08] rounded-lg'>
                <span className='text-neutral-200'>Create Backup</span>
                <span className={shouldBackup ? 'text-green-400' : 'text-neutral-400'}>{shouldBackup ? 'Yes' : 'No'}</span>
              </div>
              <div className='flex justify-between items-center py-2 px-3 bg-[#ffffff08] rounded-lg'>
                <span className='text-neutral-200'>Wipe Files</span>
                <span className={shouldWipe ? 'text-amber-400' : 'text-neutral-400'}>{shouldWipe ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>

          {eggPreview.warnings && eggPreview.warnings.length > 0 && (
            <div className='space-y-3'>
              {eggPreview.warnings.map((warning, index) => (
                <div key={index} className={`p-4 border rounded-lg ${warning.severity === 'error' ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                  <div className='flex items-start gap-3'>
                    <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${warning.severity === 'error' ? 'text-red-400' : 'text-amber-400'}`} />
                    <div>
                      <h4 className={`font-semibold mb-2 ${warning.severity === 'error' ? 'text-red-400' : 'text-amber-400'}`}>
                        {warning.type === 'subdomain_incompatible' ? 'Subdomain Will Be Deleted' : 'Warning'}
                      </h4>
                      <p className='text-sm text-neutral-300'>{warning.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className='p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg'>
            <div className='flex items-start gap-3'>
              <AlertTriangle className='w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5' />
              <div>
                <h4 className='text-amber-400 font-semibold mb-2'>This will:</h4>
                <ul className='text-sm text-neutral-300'>
                  <li>-- Stop and reinstall your server</li>
                  <li>-- Take several minutes to complete</li>
                  <li>-- Modify and remove some files</li>
                </ul>
                <span className='text-sm font-bold mt-4 block'>
                  Please ensure you have backups of important data before proceeding.
                </span>
              </div>
            </div>
          </div>

          <div className='flex flex-col sm:flex-row justify-center gap-3 pt-4'>
            <Button variant='outline' onClick={() => setCurrentStep('configure')}>Back to Configure</Button>
            <Button onClick={applyChanges} disabled={isLoading}>{isLoading ? 'Applying...' : 'Apply Changes'}</Button>
          </div>
        </div>
      )}

      {/* Wipe Files Confirmation */}
      <AlertDialog open={showWipeConfirmation} onOpenChange={setShowWipeConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wipe All Files Without Backup?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='space-y-4'>
                <div className='flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg'>
                  <AlertTriangle className='w-5 h-5 text-red-400 flex-shrink-0 mt-0.5' />
                  <div>
                    <h4 className='text-red-400 font-semibold mb-2'>DANGER: No Backup Selected</h4>
                    <p className='text-sm text-neutral-300'>
                      You have chosen to wipe all files <strong>without creating a backup</strong>. This action will{' '}
                      <strong>permanently delete ALL files</strong> on your server and cannot be undone.
                    </p>
                  </div>
                </div>
                <div className='text-sm text-neutral-300 space-y-2'>
                  <p><strong>What will happen:</strong></p>
                  <ul className='list-disc list-inside space-y-1 ml-4'>
                    <li>All server files will be permanently deleted</li>
                    <li>Your server will be stopped and reinstalled</li>
                    <li>Any custom configurations or data will be lost</li>
                    <li>This action cannot be reversed</li>
                  </ul>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setShowWipeConfirmation(false); executeApplyChanges(); }}
              disabled={wipeCountdown > 0}
            >
              {wipeCountdown > 0 ? `Yes, Wipe Files (${wipeCountdown}s)` : 'Yes, Wipe Files'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ShellContainer;
