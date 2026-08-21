import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { type LucideProps } from "lucide-react";
import dynamicIconImports from "lucide-react/dynamicIconImports";

interface IconProps extends LucideProps {
  name: keyof typeof dynamicIconImports;
}

const iconCache = new Map<string, ComponentType<LucideProps>>();

const getIcon = (name: keyof typeof dynamicIconImports): ComponentType<LucideProps> => {
  let icon = iconCache.get(name);
  if (!icon) {
    icon = dynamic(dynamicIconImports[name]);
    iconCache.set(name, icon);
  }
  return icon;
};

// oxlint-disable react/static-components -- wrappers are stateless lazy-loaded icons,
// cached at module level so the same component instance is reused across renders
const Icon = ({ name, ...props }: IconProps) => {
  const LucideIcon = getIcon(name);

  return <LucideIcon {...props} />;
};

export default Icon;
