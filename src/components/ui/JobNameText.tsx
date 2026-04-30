import { forwardRef, type HTMLAttributes } from "react";

const JOB_NAME_CLASS =
  "inline-block max-w-full truncate text-[0.8125rem] leading-snug font-medium tracking-tight text-text-primary [font-feature-settings:'cv02','ss01']";

export type JobNameTextProps = HTMLAttributes<HTMLSpanElement> & {
  title?: string;
};

export const JobNameText = forwardRef<HTMLSpanElement, JobNameTextProps>(
  function JobNameText({ className = "", title, children, ...rest }, ref) {
    return (
      <span
        ref={ref}
        title={title}
        className={`${JOB_NAME_CLASS} ${className}`.trim()}
        {...rest}
      >
        {children}
      </span>
    );
  },
);
