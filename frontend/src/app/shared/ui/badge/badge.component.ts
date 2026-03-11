import { Component, input } from '@angular/core';
import { NgClass } from '@angular/common';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [NgClass],
  template: `
    <span
      [ngClass]="variantClasses()"
      class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors"
    >
      <ng-content />
    </span>
  `,
})
export class BadgeComponent {
  variant = input<BadgeVariant>('default');

  variantClasses(): string {
    const variants: Record<BadgeVariant, string> = {
      default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
      secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
      destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
      outline: 'text-foreground border-border',
      success: 'border-transparent bg-success/15 text-success border-success/20',
      warning: 'border-transparent bg-warning/15 text-warning border-warning/20',
    };
    return variants[this.variant()];
  }
}
