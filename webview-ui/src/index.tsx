import { render } from 'solid-js/web';
import type {} from 'solid-styled-jsx';
import EmulatorWindow from './emulator/EmulatorWindow';
import './css/main.css';

render(() => <EmulatorWindow />, document.getElementById('app')!);
