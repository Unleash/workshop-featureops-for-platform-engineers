import { activeEnvironment } from './env';

/**
 * A fixed, top-right corner ribbon that makes the active Unleash environment unmistakable
 * when a development and a production instance run side by side. Colour-coded: amber for the
 * development sandbox, emerald for live production (see `env.ts`).
 */
export const EnvRibbon = () => {
  const { bg, label } = activeEnvironment();

  return (
    <div
      className="pointer-events-none fixed right-0 top-0 z-50 h-28 w-28 overflow-hidden"
      aria-hidden="true"
    >
      <div
        className={`absolute right-[-44px] top-[26px] w-44 rotate-45 ${bg} py-1 text-center text-xs font-bold uppercase tracking-wider text-white shadow-md`}
      >
        {label}
      </div>
    </div>
  );
};
