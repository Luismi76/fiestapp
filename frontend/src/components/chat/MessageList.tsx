'use client';

import { RefObject } from 'react';
import { Message } from '@/types/match';
import { OptimizedAvatar } from '@/components/OptimizedImage';
import VoiceMessage from './VoiceMessage';
import LocationMessage from './LocationMessage';
import TranslateButton from './TranslateButton';

interface MessageListProps {
  messages: Message[];
  currentUserId: string | null | undefined;
  otherUser: {
    name?: string;
    avatar?: string;
  } | undefined;
  otherUserTyping: boolean;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  getAvatarSrc: (avatar?: string) => string;
  onTranslate: (messageId: string, targetLang: string) => Promise<{ translatedText: string; detectedLanguage?: string }>;
}

const formatMessageTime = (date: string) => {
  return new Date(date).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatMessageDate = (date: string) => {
  const msgDate = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (msgDate.toDateString() === today.toDateString()) {
    return 'Hoy';
  } else if (msgDate.toDateString() === yesterday.toDateString()) {
    return 'Ayer';
  } else {
    return msgDate.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }
};

export default function MessageList({
  messages,
  currentUserId,
  otherUser,
  otherUserTyping,
  messagesEndRef,
  getAvatarSrc,
  onTranslate,
}: MessageListProps) {
  const shouldShowDateSeparator = (currentIndex: number) => {
    if (currentIndex === 0) return true;
    const currentDate = new Date(messages[currentIndex].createdAt).toDateString();
    const prevDate = new Date(messages[currentIndex - 1].createdAt).toDateString();
    return currentDate !== prevDate;
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-blue-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-700 mb-1">No hay mensajes aún</h3>
          <p className="text-gray-400 text-sm">¡Inicia la conversación con {otherUser?.name}!</p>
        </div>
        <div ref={messagesEndRef} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.map((message, index) => {
        const isMe = message.senderId === currentUserId;
        const showAvatar = !isMe && (index === 0 || messages[index - 1].senderId !== message.senderId);
        const isLastFromSender = index === messages.length - 1 || messages[index + 1].senderId !== message.senderId;
        const showDateSeparator = shouldShowDateSeparator(index);

        return (
          <div key={message.id}>
            {/* Date separator */}
            {showDateSeparator && (
              <div className="flex items-center justify-center my-4">
                <div className="bg-gray-100 text-gray-500 text-xs font-medium px-3 py-1 rounded-full">
                  {formatMessageDate(message.createdAt)}
                </div>
              </div>
            )}

            <div
              className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2 ${
                isLastFromSender ? 'mb-2' : 'mb-0.5'
              }`}
            >
              {/* Avatar for other user */}
              {!isMe && (
                <div className={`flex-shrink-0 ${showAvatar ? '' : 'invisible'}`}>
                  <div className="ring-2 ring-white shadow-sm rounded-full">
                    <OptimizedAvatar
                      src={getAvatarSrc(otherUser?.avatar)}
                      name={otherUser?.name || '?'}
                      size="sm"
                      className="w-7 h-7"
                    />
                  </div>
                </div>
              )}

              {/* Message bubble */}
              <div className="max-w-[75%] group relative">
                {/* Voice message */}
                {message.type === 'VOICE' && message.voiceUrl ? (
                  <VoiceMessage
                    url={message.voiceUrl}
                    duration={message.voiceDuration || 0}
                    isOwn={isMe}
                  />
                ) : message.type === 'LOCATION' && message.latitude && message.longitude ? (
                  /* Location message */
                  <LocationMessage
                    latitude={message.latitude}
                    longitude={message.longitude}
                    locationName={message.locationName}
                    isOwn={isMe}
                  />
                ) : (
                  /* Text message */
                  <div
                    className={`px-4 py-2.5 ${
                      isMe
                        ? `bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md ${
                            isLastFromSender ? 'rounded-2xl rounded-br-md' : 'rounded-2xl'
                          }`
                        : `bg-white text-gray-900 shadow-sm border border-gray-100 ${
                            isLastFromSender ? 'rounded-2xl rounded-bl-md' : 'rounded-2xl'
                          }`
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                  </div>
                )}
                {/* Translate button for non-own messages */}
                {!isMe && message.type !== 'VOICE' && message.type !== 'LOCATION' && message.content && (
                  <TranslateButton
                    messageId={message.id}
                    originalText={message.content}
                    originalLang={message.originalLang}
                    translations={message.translations as Record<string, string> | undefined}
                    onTranslate={onTranslate}
                    compact
                  />
                )}
                {/* Timestamp and read status */}
                <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-[10px] text-gray-400">
                    {formatMessageTime(message.createdAt)}
                  </span>
                  {isMe && (
                    <span className="text-[10px]">
                      {message.read ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-blue-500">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-gray-400">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                        </svg>
                      )}
                    </span>
                  )}
                </div>
              </div>

              {/* Spacer for alignment when I'm the sender */}
              {isMe && <div className="w-7 flex-shrink-0" />}
            </div>
          </div>
        );
      })}

      {/* Typing indicator in messages area */}
      {otherUserTyping && (
        <div className="flex items-end gap-2">
          <div className="flex-shrink-0 ring-2 ring-white shadow-sm rounded-full">
            <OptimizedAvatar
              src={getAvatarSrc(otherUser?.avatar)}
              name={otherUser?.name || '?'}
              size="sm"
              className="w-7 h-7"
            />
          </div>
          <div className="bg-white shadow-sm border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
