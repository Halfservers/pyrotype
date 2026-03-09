import { useEffect } from 'react';
import { useForm, useStore } from '@tanstack/react-form';
import { Shield, Settings } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import Can from '@/components/elements/can';

import { useServerStore } from '@/store/server';
import { useAppStore } from '@/store';
import type { Subuser } from '@/store/server';
import { useCreateSubuserMutation, useUpdateSubuserMutation } from '@/lib/queries';
import { useFlashKey, usePermissions } from '@/lib/hooks';
import { useDeepCompareMemo } from '@/lib/hooks';
import permissions from '@/lib/permissions';

interface Props {
  subuser?: Subuser;
  onSuccess: (subuser?: Subuser) => void;
  onCancel: () => void;
  flashKey: string;
  isSubmitting?: boolean;
  setIsSubmitting?: (submitting: boolean) => void;
}

const UserFormComponent = ({ subuser, onSuccess, onCancel, flashKey, isSubmitting, setIsSubmitting }: Props) => {
  const serverId = useServerStore((state) => state.server!.id);
  const isRootAdmin = useAppStore((state) => state.userData?.rootAdmin ?? false);
  const loggedInPermissions = useServerStore((state) => state.serverPermissions);
  const [canEditUser] = usePermissions(subuser ? ['user.update'] : ['user.create']);

  const { clearFlashes, clearAndAddHttpError } = useFlashKey(flashKey);

  const createMutation = useCreateSubuserMutation(serverId);
  const updateMutation = useUpdateSubuserMutation(serverId);

  const editablePermissions = useDeepCompareMemo(() => {
    const cleaned = Object.keys(permissions).map((key) =>
      Object.keys(permissions[key]?.keys ?? {}).map((pkey) => `${key}.${pkey}`),
    );
    const list: string[] = ([] as string[]).concat.apply([], Object.values(cleaned));

    if (isRootAdmin || (loggedInPermissions.length === 1 && loggedInPermissions[0] === '*')) {
      return list;
    }
    return list.filter((key) => loggedInPermissions.indexOf(key) >= 0);
  }, [isRootAdmin, permissions, loggedInPermissions]);

  const form = useForm({
    defaultValues: {
      email: subuser?.email || '',
      permissions: subuser?.permissions || ([] as string[]),
    },
    onSubmit: ({ value }) => {
      if (setIsSubmitting) setIsSubmitting(true);
      clearFlashes();

      const mutation = subuser ? updateMutation : createMutation;
      const params = subuser
        ? { email: value.email, permissions: value.permissions, subuser }
        : { email: value.email, permissions: value.permissions };

      mutation.mutate(params as any, {
        onSuccess: (result) => onSuccess(result),
        onError: (error) => {
          if (setIsSubmitting) setIsSubmitting(false);
          clearAndAddHttpError(error);
        },
      });
    },
  });

  useEffect(() => {
    return () => {
      clearFlashes();
    };
  }, []);

  const watchedPermissions: string[] = useStore(form.store, (s: { values: { permissions: string[] } }) => s.values.permissions);

  const toggleAllPermissions = () => {
    const allSelected = editablePermissions.every((p) => watchedPermissions.includes(p));
    form.setFieldValue('permissions', allSelected ? [] : [...editablePermissions]);
  };

  const toggleCategoryPermissions = (key: string) => {
    const categoryPermissions = Object.keys(permissions[key]?.keys ?? {}).map((pkey) => `${key}.${pkey}`);
    const allSelected = categoryPermissions.every((p) => watchedPermissions.includes(p));

    if (allSelected) {
      form.setFieldValue('permissions', watchedPermissions.filter((p: string) => !categoryPermissions.includes(p)));
    } else {
      const newPermissions = [...watchedPermissions];
      categoryPermissions.forEach((p) => {
        if (!newPermissions.includes(p) && editablePermissions.includes(p)) {
          newPermissions.push(p);
        }
      });
      form.setFieldValue('permissions', newPermissions);
    }
  };

  const togglePermission = (permission: string) => {
    if (watchedPermissions.includes(permission)) {
      form.setFieldValue('permissions', watchedPermissions.filter((p: string) => p !== permission));
    } else {
      form.setFieldValue('permissions', [...watchedPermissions, permission]);
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} className='space-y-6'>
      {!subuser && (
        <div className='bg-gradient-to-b from-[#ffffff08] to-[#ffffff05] border border-[#ffffff12] rounded-xl p-6'>
          <h3 className='text-xl font-semibold text-zinc-100 mb-6'>User Information</h3>
          <form.Field
            name='email'
            children={(field) => (
              <div className='space-y-2'>
                <Label>Email Address</Label>
                <Input
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder='Enter the email of the user to invite'
                />
                {field.state.meta.errors.length > 0 && (
                  <p className='text-sm text-destructive'>{field.state.meta.errors.map(String).join(', ')}</p>
                )}
              </div>
            )}
          />
        </div>
      )}

      <div className='bg-gradient-to-b from-[#ffffff08] to-[#ffffff05] border border-[#ffffff12] rounded-xl p-6'>
        <div className='flex items-center justify-between mb-6'>
          <div className='flex items-center gap-3'>
            <Settings className='w-5 h-5 text-brand' />
            <h3 className='text-xl font-semibold text-zinc-100'>Detailed Permissions</h3>
          </div>
          {canEditUser && (
            <Button type='button' variant='outline' size='sm' onClick={toggleAllPermissions}>
              {editablePermissions.every((p) => watchedPermissions.includes(p)) ? 'Deselect All' : 'Select All'}
            </Button>
          )}
        </div>

        {!isRootAdmin && loggedInPermissions[0] !== '*' && (
          <div className='mb-6 p-4 bg-brand/10 border border-brand/20 rounded-lg'>
            <div className='flex items-center gap-3 mb-2'>
              <Shield className='w-5 h-5 text-brand' />
              <span className='text-sm font-semibold text-brand'>Permission Restriction</span>
            </div>
            <p className='text-sm text-zinc-300 leading-relaxed'>
              You can only assign permissions that you currently have access to.
            </p>
          </div>
        )}

        <div className='space-y-4'>
          {Object.keys(permissions)
            .filter((key) => key !== 'websocket')
            .map((key) => (
              <div key={key} className='border border-[#ffffff12] rounded-lg p-4'>
                <div className='flex items-start justify-between mb-3'>
                  <div className='flex-1 min-w-0'>
                    <h4 className='font-medium text-zinc-200 capitalize'>{key}</h4>
                    <p className='text-xs text-zinc-400 mt-1'>{permissions[key]?.description}</p>
                  </div>
                  {canEditUser && (
                    <Button type='button' variant='ghost' size='sm' onClick={() => toggleCategoryPermissions(key)}>
                      {Object.keys(permissions[key]?.keys ?? {})
                        .map((pkey) => `${key}.${pkey}`)
                        .every((p) => watchedPermissions.includes(p))
                        ? 'Deselect All'
                        : 'Select All'}
                    </Button>
                  )}
                </div>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                  {Object.keys(permissions[key]?.keys ?? {}).map((pkey) => {
                    const permission = `${key}.${pkey}`;
                    const disabled = !canEditUser || editablePermissions.indexOf(permission) < 0;
                    return (
                      <label
                        key={permission}
                        htmlFor={`permission_${permission}`}
                        className={`flex items-start gap-2 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}
                      >
                        <Checkbox
                          id={`permission_${permission}`}
                          checked={watchedPermissions.includes(permission)}
                          disabled={disabled}
                          onCheckedChange={() => togglePermission(permission)}
                          className='mt-0.5'
                        />
                        <div>
                          <p className='font-medium text-sm'>{pkey}</p>
                          {(permissions[key]?.keys?.[pkey]?.length ?? 0) > 0 && (
                            <p className='text-xs text-neutral-400 mt-1'>{permissions[key]?.keys?.[pkey] ?? ''}</p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      </div>

      <Can action={subuser ? 'user.update' : 'user.create'}>
        <div className='flex gap-3 justify-end pt-4 border-t border-[#ffffff12]'>
          <Button variant='outline' type='button' onClick={onCancel}>
            Cancel
          </Button>
          <Button type='submit' disabled={isSubmitting}>
            {subuser ? 'Save Changes' : 'Invite User'}
          </Button>
        </div>
      </Can>
    </form>
  );
};

export default UserFormComponent;
