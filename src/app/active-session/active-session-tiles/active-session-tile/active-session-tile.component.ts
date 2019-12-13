import { Component, Input } from '@angular/core';
import { SocketService } from "../../../services/socket.service";
import { TerminateSessionMessage, TerminateSessionPayload } from "../../model/events.model";
import { MatDialog, MatDialogConfig } from '@angular/material';
import { ConfirmDialogComponent } from 'src/app/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'active-session-tile',
  templateUrl: './active-session-tile.component.html',
  styleUrls: ['./active-session-tile.component.scss']
})
export class ActiveSessionTileComponent {
  @Input() id: string;
  constructor(private socketService: SocketService, private dialog: MatDialog) {
  }

  urlEncode = (id: string) => encodeURIComponent(id);

  closeSession = (id: string) => {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.disableClose = false;
    dialogConfig.autoFocus = true;
    dialogConfig.data = {
      id: id,
      message: 'Destroy Session - Be You Certain?'
    };
    const dialogRef = this.dialog.open(ConfirmDialogComponent, dialogConfig)

    dialogRef.afterClosed().subscribe(this.destroySessionIfItIsWilled);
  }

  private destroySessionIfItIsWilled = (result: boolean) => {
    if (result) {
      const message = new TerminateSessionMessage(new TerminateSessionPayload(this.id));
      this.socketService.send(message);
    }
  }
}
