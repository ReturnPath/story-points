import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Participant, StoryPointSession} from '../active-session/model/session.model';
import {MatDialog, MatDialogConfig} from '@angular/material';
import {JoinSessionDialogComponent} from '../join-session-dialog/join-session-dialog.component';
import {LocalStorageService} from '../services/local-storage.service';
import {Session, SessionSettings} from '../services/local-storage.model';

@Component({
  selector: 'control-panel',
  templateUrl: './control-panel.component.html',
  styleUrls: ['./control-panel.component.scss']
})
export class ControlPanelComponent implements OnInit {
  @Input() sessionId: number;
  @Input() participant: Participant;
  @Output() participantJoined: EventEmitter<Participant> = new EventEmitter<Participant>();
  @Output() participantLeft: EventEmitter<Participant> = new EventEmitter<Participant>();
  @Output() pointVisibilityEvent: EventEmitter<PointVisibilityChange> = new EventEmitter<PointVisibilityChange>();
  @Output() voteSubmitted: EventEmitter<any> = new EventEmitter<any>();

  showAdminConsole: boolean;

  constructor(private dialog: MatDialog,
              private localStorage: LocalStorageService) {
  }

  ngOnInit(): void {
    // happens when session is created by another client
    if (!this.localStorage.getSession(String(this.sessionId))) {
      this.localStorage.setSession(String(this.sessionId), new Session({} as Participant, new SessionSettings(false)));
    }
    this.showAdminConsole = this.localStorage.getShowAdminConsole(String(this.sessionId));
  }

  joinSession = () => {
    const dialogRef = this.dialog.open(JoinSessionDialogComponent, this.getDialogConfig());

    dialogRef.afterClosed().subscribe((participant: Participant) => {
      this.participantJoined.emit(participant);
    });
  };

  leaveSession = () => {
    this.participantLeft.emit(this.participant);
  };

  changePointVisibility = (state: PointVisibilityChange) => {
    this.pointVisibilityEvent.emit(state);
  };

  submitVote = (vote) => {
    this.voteSubmitted.emit(vote);
  };

  settingChanged = (event) => {
    this.localStorage.setShowAdminConsole(String(this.sessionId), event.checked);
  };

  private getDialogConfig = () => {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.disableClose = false;
    dialogConfig.autoFocus = true;
    dialogConfig.data = {
      participant: 'Identify Yourself!'
    };
    return dialogConfig;
  };
}

export declare type PointVisibilityChange = 'reset' | 'reveal' | 'hide';