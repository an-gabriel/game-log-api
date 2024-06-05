import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { LogProcessedEvent } from '../log-processed.event';

@EventsHandler(LogProcessedEvent)
export class LogProcessedHandler implements IEventHandler<LogProcessedEvent> {
    handle(event: LogProcessedEvent) {
        console.log('Logs processed:', event.logs);
    }
}
