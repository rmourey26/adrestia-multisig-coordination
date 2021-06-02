import * as http from 'http';
import { Repositories } from '../db/repositories';
import messageService, { MessageService } from './message-service';
import notificationService, { NotificationService } from './notification-service';

export interface Services {
  notificationService: NotificationService;
  messageService: MessageService;
}

/**
 * Configures all the services required by the app
 *
 * @param repositories repositories to be used by the services
 */
export const configure = (httpServer: http.Server, repositories: Repositories): Services => {
  const notificationServiceInstance = notificationService(httpServer);
  return {
    notificationService: notificationServiceInstance,
    messageService: messageService(notificationServiceInstance, repositories.messageRepository)
  };
};