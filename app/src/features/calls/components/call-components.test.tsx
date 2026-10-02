import { render, screen, userEvent } from '@testing-library/react-native';

import { CallHeader } from '@/features/calls/components/CallHeader';
import { CallControls } from '@/features/calls/components/CallControls';
import { AudioCallView } from '@/features/calls/components/AudioCallView';
import { VideoCallView } from '@/features/calls/components/VideoCallView';
import { RingingView } from '@/features/calls/components/RingingView';
import { ThemeProvider } from '@/theme';

jest.mock('react-native-safe-area-context', () => {
  const React = require('react') as typeof import('react');
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
    useSafeAreaInsets: () => ({ top: 40, bottom: 20, left: 0, right: 0 }),
  };
});

describe('Call Components', () => {
  describe('CallHeader', () => {
    it('renders connected state with duration and coin rate', async () => {
      await render(
        <ThemeProvider>
          <CallHeader
            name="Alice"
            status="CONNECTED"
            durationSeconds={125}
            rate={30}
          />
        </ThemeProvider>,
      );

      expect(screen.getByText('Alice')).toBeOnTheScreen();
      expect(screen.getByText('2:05')).toBeOnTheScreen();
      expect(screen.getByText(/30\/min/)).toBeOnTheScreen();
    });

    it('renders ringing status when not connected', async () => {
      await render(
        <ThemeProvider>
          <CallHeader
            name="Bob"
            status="RINGING"
            durationSeconds={0}
          />
        </ThemeProvider>,
      );

      expect(screen.getByText('Bob')).toBeOnTheScreen();
      expect(screen.getByText('Ringing...')).toBeOnTheScreen();
    });
  });

  describe('CallControls', () => {
    it('renders audio-only controls without camera or flip buttons', async () => {
      const onToggleMute = jest.fn();
      const onToggleSpeaker = jest.fn();
      const onEndCall = jest.fn();

      await render(
        <ThemeProvider>
          <CallControls
            video={false}
            muted={false}
            cameraEnabled={false}
            speakerOn={false}
            onToggleMute={onToggleMute}
            onToggleCamera={jest.fn()}
            onFlipCamera={jest.fn()}
            onToggleSpeaker={onToggleSpeaker}
            onEndCall={onEndCall}
          />
        </ThemeProvider>,
      );

      expect(screen.getByRole('button', { name: 'Mute' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Earpiece' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'End' })).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'Cam On' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Flip' })).toBeNull();

      await userEvent.press(screen.getByRole('button', { name: 'Mute' }));
      expect(onToggleMute).toHaveBeenCalledTimes(1);

      await userEvent.press(screen.getByRole('button', { name: 'End' }));
      expect(onEndCall).toHaveBeenCalledTimes(1);
    });

    it('renders video controls with camera toggle and flip buttons', async () => {
      const onToggleCamera = jest.fn();
      const onFlipCamera = jest.fn();

      await render(
        <ThemeProvider>
          <CallControls
            video={true}
            muted={true}
            cameraEnabled={true}
            speakerOn={true}
            onToggleMute={jest.fn()}
            onToggleCamera={onToggleCamera}
            onFlipCamera={onFlipCamera}
            onToggleSpeaker={jest.fn()}
            onEndCall={jest.fn()}
          />
        </ThemeProvider>,
      );

      expect(screen.getByRole('button', { name: 'Unmute' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Speaker' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Cam On' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Flip' })).toBeOnTheScreen();

      await userEvent.press(screen.getByRole('button', { name: 'Cam On' }));
      expect(onToggleCamera).toHaveBeenCalledTimes(1);

      await userEvent.press(screen.getByRole('button', { name: 'Flip' }));
      expect(onFlipCamera).toHaveBeenCalledTimes(1);
    });
  });

  describe('AudioCallView', () => {
    it('renders speaking indicator when active', async () => {
      await render(
        <ThemeProvider>
          <AudioCallView name="Charlie" isSpeaking={true} />
        </ThemeProvider>,
      );

      expect(screen.getByText('Speaking...')).toBeOnTheScreen();
    });

    it('renders connected indicator when quiet', async () => {
      await render(
        <ThemeProvider>
          <AudioCallView name="Charlie" isSpeaking={false} />
        </ThemeProvider>,
      );

      expect(screen.getByText('Connected')).toBeOnTheScreen();
    });
  });

  describe('VideoCallView', () => {
    it('renders stream placeholder when remote camera is enabled', async () => {
      await render(
        <ThemeProvider>
          <VideoCallView
            name="Diana"
            cameraEnabled={true}
            remoteCameraEnabled={true}
          />
        </ThemeProvider>,
      );

      expect(screen.getByText('Live Video Stream Active')).toBeOnTheScreen();
      expect(screen.getByText('You')).toBeOnTheScreen();
    });

    it('renders camera off fallback when remote camera is turned off', async () => {
      await render(
        <ThemeProvider>
          <VideoCallView
            name="Diana"
            cameraEnabled={false}
            remoteCameraEnabled={false}
          />
        </ThemeProvider>,
      );

      expect(screen.getByText(/Diana turned off camera/)).toBeOnTheScreen();
      expect(screen.getByText('Camera off')).toBeOnTheScreen();
    });
  });

  describe('RingingView', () => {
    it('renders outgoing ringing screen with cancel button', async () => {
      const onReject = jest.fn();

      await render(
        <ThemeProvider>
          <RingingView
            name="Eve"
            video={false}
            outgoing={true}
            rate={25}
            onAnswer={jest.fn()}
            onReject={onReject}
          />
        </ThemeProvider>,
      );

      expect(screen.getByText('Eve')).toBeOnTheScreen();
      expect(screen.getByText('Calling...')).toBeOnTheScreen();
      expect(screen.getByText('25 coins/min')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Cancel Call' })).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'Accept Call' })).toBeNull();

      await userEvent.press(screen.getByRole('button', { name: 'Cancel Call' }));
      expect(onReject).toHaveBeenCalledTimes(1);
    });

    it('renders incoming ringing screen with Accept and Decline buttons', async () => {
      const onAnswer = jest.fn();
      const onReject = jest.fn();

      await render(
        <ThemeProvider>
          <RingingView
            name="Frank"
            video={true}
            outgoing={false}
            onAnswer={onAnswer}
            onReject={onReject}
          />
        </ThemeProvider>,
      );

      expect(screen.getByText('Frank')).toBeOnTheScreen();
      expect(screen.getByText('is calling you...')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Accept Call' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Decline Call' })).toBeOnTheScreen();

      await userEvent.press(screen.getByRole('button', { name: 'Accept Call' }));
      expect(onAnswer).toHaveBeenCalledTimes(1);

      await userEvent.press(screen.getByRole('button', { name: 'Decline Call' }));
      expect(onReject).toHaveBeenCalledTimes(1);
    });
  });
});
