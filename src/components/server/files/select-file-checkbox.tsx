import { Checkbox } from '@/components/ui/checkbox';
import { useServerStore } from '@/store/server';

const SelectFileCheckbox = ({ name }: { name: string }) => {
  const isChecked = useServerStore((state) => state.selectedFiles.indexOf(name) >= 0);
  const appendSelectedFile = useServerStore((state) => state.appendSelectedFile);
  const removeSelectedFile = useServerStore((state) => state.removeSelectedFile);

  return (
    <Checkbox
      className='ml-4'
      name='selectedFiles'
      value={name}
      checked={isChecked}
      onCheckedChange={isChecked ? () => removeSelectedFile(name) : () => appendSelectedFile(name)}
    />
  );
};

export default SelectFileCheckbox;
