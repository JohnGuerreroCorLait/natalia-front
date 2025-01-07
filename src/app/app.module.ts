import { NgModule, CUSTOM_ELEMENTS_SCHEMA  } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { AsistenteVozComponent } from './components/asistente-voz/asistente-voz.component';
import { HttpClientModule } from '@angular/common/http';
import { AgenteComponent } from './components/agente/agente.component';
import { AppRoutingModule } from './app-routing.module';
import { VisualizerComponent } from './components/threejs-audio-visualizer/threejs-audio-visualizer.component';
import { DialogflowComponent } from './components/dialogflow/dialogflow.component';
import { SwarmComponent } from './components/swarm/swarm.component';

@NgModule({
  declarations: [
    AppComponent,
    AsistenteVozComponent,
    AgenteComponent,
    VisualizerComponent,
    DialogflowComponent,
    SwarmComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // Agrega esta línea
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
