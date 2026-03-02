import { ChevronDown, ChevronUp, Lock } from 'lucide-react';
import debounce from 'debounce';
import { memo, useState } from 'react';
import isEqual from 'react-fast-compare';

import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useServerStore } from '@/store/server';
import type { ServerEggVariable } from '@/lib/api/transformers';
import { useUpdateStartupVariableMutation } from '@/lib/queries';
import { useFlashKey } from '@/lib/hooks';

interface Props {
  variable: ServerEggVariable;
}

const VariableBox = ({ variable }: Props) => {
  const FLASH_KEY = `server:startup:${variable.envVariable}`;

  const serverId = useServerStore((state) => state.server!.id);
  const [loading, setLoading] = useState(false);
  const { clearFlashes, clearAndAddHttpError } = useFlashKey(FLASH_KEY);
  const [dropDownOpen, setDropDownOpen] = useState(false);

  const updateMutation = useUpdateStartupVariableMutation(serverId);

  const setVariableValue = debounce((value: string) => {
    setLoading(true);
    clearFlashes();

    updateMutation.mutate(
      { key: variable.envVariable, value },
      {
        onError: (error) => clearAndAddHttpError(error),
        onSettled: () => setLoading(false),
      },
    );
  }, 500);

  const useSwitch = variable.rules.some(
    (v) => v === 'boolean' || v === 'in:0,1' || v === 'in:1,0' || v === 'in:true,false' || v === 'in:false,true',
  );
  const isStringSwitch = variable.rules.some((v) => v === 'string');
  const selectValues = variable.rules.find((v) => v.startsWith('in:'))?.split(',') || [];

  return (
    <div className='flex flex-col justify-between gap-4 bg-gradient-to-b from-[#ffffff08] to-[#ffffff05] border border-[#ffffff15] p-4 sm:p-5 rounded-xl hover:border-[#ffffff20] transition-all'>
      <div className='space-y-3'>
        <div className='flex flex-col items-baseline sm:flex-row sm:justify-between gap-2 sm:gap-3'>
          <div className='flex items-center gap-2 min-w-0'>
            {!variable.isEditable && (
              <Lock className='w-4 h-4 text-neutral-500 flex-shrink-0' />
            )}
            <span className='text-sm font-medium text-neutral-200 break-words'>{variable.name}</span>
          </div>
          <div className='text-xs leading-5 text-neutral-500 font-mono rounded w-fit'>
            {variable.envVariable}
          </div>
        </div>
        <p className='text-xs sm:text-sm text-neutral-400 leading-relaxed break-words'>
          {variable.description}
        </p>
      </div>
      <div className='relative'>
        {loading && (
          <div className='absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl z-10'>
            <div className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin' />
          </div>
        )}
        {useSwitch ? (
          <div className='flex items-center justify-between p-3 sm:p-4 bg-gradient-to-b from-[#ffffff06] to-[#ffffff03] border border-[#ffffff10] rounded-xl'>
            <span className='text-sm font-medium text-neutral-300'>
              {isStringSwitch
                ? variable.serverValue === 'true'
                  ? 'Enabled'
                  : 'Disabled'
                : variable.serverValue === '1'
                  ? 'On'
                  : 'Off'}
            </span>
            <Switch
              disabled={!variable.isEditable}
              defaultChecked={
                isStringSwitch ? variable.serverValue === 'true' : variable.serverValue === '1'
              }
              onCheckedChange={() => {
                if (variable.isEditable) {
                  if (isStringSwitch) {
                    setVariableValue(variable.serverValue === 'true' ? 'false' : 'true');
                  } else {
                    setVariableValue(variable.serverValue === '1' ? '0' : '1');
                  }
                }
              }}
            />
          </div>
        ) : (
          <>
            {selectValues.length > 0 && (variable.serverValue ?? variable.defaultValue) ? (
              <DropdownMenu onOpenChange={(open) => setDropDownOpen(open)}>
                <DropdownMenuTrigger asChild>
                  <button
                    className='w-full flex items-center justify-between gap-3 h-11 sm:h-12 px-3 sm:px-4 text-sm font-medium text-white transition-all duration-200 bg-gradient-to-b from-[#ffffff10] to-[#ffffff09] border border-[#ffffff15] rounded-xl hover:from-[#ffffff15] hover:to-[#ffffff10] hover:border-[#ffffff25] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                    disabled={!variable.isEditable}
                  >
                    <span className='font-mono text-neutral-200 truncate text-left'>
                      {variable.serverValue}
                    </span>
                    {dropDownOpen ? (
                      <ChevronUp className='w-3.5 h-3.5 opacity-60 flex-shrink-0' />
                    ) : (
                      <ChevronDown className='w-3.5 h-3.5 opacity-60 flex-shrink-0' />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className='z-[99999]' sideOffset={8}>
                  <DropdownMenuRadioGroup
                    value={variable.serverValue ?? ''}
                    onValueChange={setVariableValue}
                  >
                    {selectValues.map((selectValue) => (
                      <DropdownMenuRadioItem
                        key={selectValue.replace('in:', '')}
                        value={selectValue.replace('in:', '')}
                      >
                        {selectValue.replace('in:', '')}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Input
                className='w-full h-11 sm:h-12 text-sm sm:text-base'
                onKeyUp={(e) => {
                  if (variable.isEditable) {
                    setVariableValue(e.currentTarget.value);
                  }
                }}
                readOnly={!variable.isEditable}
                name={variable.envVariable}
                defaultValue={variable.serverValue ?? ''}
                placeholder={variable.defaultValue || 'Enter value...'}
                disabled={!variable.isEditable}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default memo(VariableBox, isEqual);
