import { useState } from 'react';

import { useServerStore } from '@/store/server';
import { GAME_FEATURES } from '@/components/server/game/types';
import EulaModal from '@/components/server/game/EulaModal';
import JavaVersionSelector from '@/components/server/game/JavaVersionSelector';
import PidLimitDisplay from '@/components/server/game/PidLimitDisplay';
import SteamDiskSpace from '@/components/server/game/SteamDiskSpace';
import GslToken from '@/components/server/game/GslToken';
import { Button } from '@/components/ui/button';

import type { GameFeatureKey } from '@/components/server/game/types';

const featureComponentMap: Record<GameFeatureKey, React.ComponentType | null> = {
  [GAME_FEATURES.EULA]: null, // handled separately via modal
  [GAME_FEATURES.JAVA_VERSION]: JavaVersionSelector,
  [GAME_FEATURES.PID_LIMIT]: PidLimitDisplay,
  [GAME_FEATURES.STEAM_DISK_SPACE]: SteamDiskSpace,
  [GAME_FEATURES.GSL_TOKEN]: GslToken,
};

const GameFeatureList = () => {
  const eggFeatures = useServerStore((s) => s.server?.eggFeatures ?? []);
  const [eulaOpen, setEulaOpen] = useState(false);

  const hasEula = eggFeatures.includes(GAME_FEATURES.EULA);
  const featureKeys = eggFeatures.filter(
    (f): f is GameFeatureKey => f !== GAME_FEATURES.EULA && f in featureComponentMap,
  );

  if (!hasEula && featureKeys.length === 0) {
    return (
      <div className='py-4 text-center text-sm text-zinc-500'>
        No game features available for this server.
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {hasEula && (
        <div className='space-y-2'>
          <div className='flex items-center justify-between rounded-md border border-[#ffffff12] bg-[#ffffff08] px-4 py-3'>
            <div>
              <p className='text-sm font-medium text-zinc-200'>Minecraft EULA</p>
              <p className='text-xs text-zinc-500'>
                You must accept the Minecraft EULA to run this server.
              </p>
            </div>
            <Button size='sm' onClick={() => setEulaOpen(true)}>
              Review EULA
            </Button>
          </div>
          <EulaModal open={eulaOpen} onOpenChange={setEulaOpen} />
        </div>
      )}

      {featureKeys.map((featureKey) => {
        const Component = featureComponentMap[featureKey];
        if (!Component) return null;
        return <Component key={featureKey} />;
      })}
    </div>
  );
};

export default GameFeatureList;
