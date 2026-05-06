'use client';

import QueueBoard from '../_components/QueueBoard';
import MenuBoard from '../_components/MenuBoard';

export default function DisplayPage() {
  return (
    <div className="fixed inset-0 flex overflow-hidden bg-neutral-950 select-none"
         style={{ cursor: 'none' }}>
      {/* Left half: Order Queue */}
      <div className="w-1/2 h-full border-r border-neutral-800">
        <QueueBoard embedded />
      </div>

      {/* Right half: Menu Board */}
      <div className="w-1/2 h-full">
        <MenuBoard embedded />
      </div>
    </div>
  );
}
