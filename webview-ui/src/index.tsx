import { render } from 'solid-js/web';
import EmulatorWindow from './emulator/EmulatorWindow';
import type {} from 'solid-styled-jsx';
import './css/main.css';

render(() => <EmulatorWindow />, document.getElementById('app')!);
