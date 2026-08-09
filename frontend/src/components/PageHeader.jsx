import { cn } from '@/lib/utils';

/**
 * Consistent in-page header under AppShell.
 */
const PageHeader = ({ title, description, actions, className }) => (
  <div
    className={cn(
      'mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
      className
    )}
  >
    <div className="min-w-0">
      <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h1>
      {description && (
        <p className="mt-1 max-w-2xl text-sm text-white/70 sm:text-base">{description}</p>
      )}
    </div>
    {actions && (
      <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
    )}
  </div>
);

export default PageHeader;
