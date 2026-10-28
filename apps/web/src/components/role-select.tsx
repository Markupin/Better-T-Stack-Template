import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@better-t-stack-template/ui/components/select";

/** Small select for a fixed list of role names. */
export function RoleSelect<T extends string>({
  value,
  roles,
  onChange,
  disabled,
}: {
  value: T;
  roles: readonly T[];
  onChange: (role: T) => void;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        if (next && next !== value) onChange(next as T);
      }}
    >
      <SelectTrigger size="sm" className="w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {roles.map((role) => (
          <SelectItem key={role} value={role}>
            {role}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
