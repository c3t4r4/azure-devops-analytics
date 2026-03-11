import { Component, input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  template: `
    <div
      class="animate-pulse rounded-md bg-muted"
      [style.width]="width()"
      [style.height]="height()"
    ></div>
  `,
})
export class SkeletonComponent {
  width = input<string>('100%');
  height = input<string>('1rem');
}
