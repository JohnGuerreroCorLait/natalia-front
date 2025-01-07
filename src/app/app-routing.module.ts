import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AsistenteVozComponent } from './components/asistente-voz/asistente-voz.component';
import { AgenteComponent } from './components/agente/agente.component';
import { VisualizerComponent } from './components/threejs-audio-visualizer/threejs-audio-visualizer.component';
import { DialogflowComponent } from './components/dialogflow/dialogflow.component';
import { SwarmComponent } from './components/swarm/swarm.component';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'visualizador' },
  { path: 'agente-ventas', component: AsistenteVozComponent },
  { path: 'swarm', component: SwarmComponent },
  { path: 'agente', component: AgenteComponent },
  { path: 'visualizador', component: VisualizerComponent },
  { path: 'dialogflow', component: DialogflowComponent },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      useHash: true,
      onSameUrlNavigation: 'reload',
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
