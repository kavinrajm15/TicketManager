import { useState, useEffect } from "react";
import Avatar from "../ui/Avatar";
import Button from "../ui/Button";
import useAuthStore from "../../store/useAuthStore";
import useSocketStore from "../../store/useSocketStore";
import { commentAPI, userAPI, teamAPI } from "../../services/api";
import MentionTextarea from "../ui/MentionTextarea";
import toast from "react-hot-toast";

const fmtTime = (d) =>
  new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// Parse @mentions and highlight them
const renderBody = (body, teamMentions = []) => {
  const teamNames = (teamMentions || []).map((t) => t.teamName);
  const parts = body.split(/(@\w+)/g);

  return parts.map((part, i) => {
    if (part.startsWith("@")) {
      const name = part.slice(1);
      const isTeam = teamNames.some(
        (tn) => tn.toLowerCase() === name.toLowerCase(),
      );
      return (
        <span
          key={i}
          className={`px-1 rounded font-semibold ${isTeam ? "bg-blue-100 text-blue-700" : "bg-primary/10 text-primary"}`}
        >
          {part}
        </span>
      );
    }
    return part;
  });
};

function CommentItem({ comment, onReplyAdded, users, teams, onDelete }) {
  const { user } = useAuthStore();
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(false);

  const isAuthor = comment.author?._id === user?._id || comment.author?.userId === user?.userId;
  const isManager = ["superadmin", "manager"].includes(user?.role);

  const submitReply = async () => {
    if (!replyText.trim()) return;
    setLoading(true);
    try {
      await commentAPI.reply(comment.commentId, { body: replyText.trim() });
      setReplyText("");
      setShowReply(false);
      toast.success("Reply added");
      onReplyAdded?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add reply");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="group animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Main comment */}
      <div className="flex gap-3">
        <Avatar
          user={comment.author}
          size="sm"
          className="mt-0.5 flex-shrink-0"
        />
        <div className="flex-1 min-w-0 max-w-2xl">
          <div className="bg-gray-100 rounded-2xl rounded-tl-none px-4 py-3 relative">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-xs font-bold text-primary">
                {comment.author?.name}
              </span>
              <span className="text-[10px] text-textMuted">
                {fmtTime(comment.createdAt)}
              </span>
            </div>
            <p className="text-sm text-textMain leading-relaxed whitespace-pre-wrap">
              {renderBody(comment.body, comment.teamMentions)}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 mt-1.5 ml-1">
            <button
              onClick={() => setShowReply((v) => !v)}
              className="text-[11px] text-textMuted hover:text-primary font-bold transition-colors"
            >
              {showReply ? "Cancel" : "Reply"}
            </button>
            {(isAuthor || isManager) && (
              <button
                onClick={() => onDelete(comment.commentId)}
                className="text-[11px] text-red-400 hover:text-red-600 font-bold transition-colors opacity-0 group-hover:opacity-100"
              >
                Delete
              </button>
            )}
          </div>

          {/* Reply input */}
          {showReply && (
            <div className="flex gap-2 mt-3 bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
              <Avatar user={user} size="xs" className="mt-1 flex-shrink-0" />
              <div className="flex-1">
                <MentionTextarea
                  users={users}
                  teams={teams}
                  onEnter={submitReply}
                  className="w-full text-sm border-none focus:ring-0 resize-none bg-transparent p-1"
                  placeholder={`Reply to ${comment.author?.name}…`}
                  rows={2}
                  value={replyText}
                  onChange={(val) => setReplyText(val)}
                />
                <div className="flex justify-end mt-1">
                  <Button size="xs" loading={loading} onClick={submitReply}>
                    Reply
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Nested replies */}
          {comment.replies?.length > 0 && (
            <div className="mt-3 ml-2 space-y-3 border-l-2 border-primary/10 pl-4">
              {comment.replies.map((reply) => {
                const isReplyAuthor = reply.author?._id === user?._id || reply.author?.userId === user?.userId;
                return (
                  <div key={reply.commentId} className="flex gap-2 group/reply">
                    <Avatar
                      user={reply.author}
                      size="xs"
                      className="mt-0.5 flex-shrink-0"
                    />
                    <div className="flex-1 max-w-xl">
                      <div className="bg-primary/5 rounded-2xl rounded-tl-none px-3 py-2">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[11px] font-bold text-primary/80">
                            {reply.author?.name}
                          </span>
                          <span className="text-[9px] text-textMuted">
                            {fmtTime(reply.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-textMain leading-relaxed whitespace-pre-wrap">
                          {renderBody(reply.body, reply.teamMentions)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 mt-1 ml-1">
                        <button
                          onClick={() => {
                            setShowReply(true);
                            setReplyText(`@${reply.author?.name} `);
                          }}
                          className="text-[10px] text-textMuted hover:text-primary font-bold transition-colors"
                        >
                          Reply
                        </button>
                        {(isReplyAuthor || isManager) && (
                          <button
                            onClick={() => onDelete(reply.commentId)}
                            className="text-[10px] text-red-400 hover:text-red-600 font-bold transition-colors opacity-0 group-hover/reply:opacity-100"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CommentThread({ ticketId }) {
  const { user } = useAuthStore();
  const { socket } = useSocketStore();
  const [comments, setComments] = useState([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);

  const fetchComments = async () => {
    setFetching(true);
    try {
      const { data } = await commentAPI.getByTicket(ticketId);
      setComments(data.comments);
    } catch {
      // silent
    } finally {
      setFetching(false);
    }
  };

  const fetchData = async () => {
    try {
      const [uRes, tRes] = await Promise.all([
        userAPI.getAll({ limit: 1000 }), // Fetch more users for mentions
        teamAPI.getAll(),
      ]);
      setUsers(uRes.data.users);
      setTeams(tRes.data.teams);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    if (ticketId) {
      fetchComments();
      fetchData();
    }
  }, [ticketId]);

  // Real-time socket logic
  useEffect(() => {
    if (socket && ticketId) {
      socket.emit("chat:joinTicket", ticketId);

      socket.on("ticket:commentsUpdated", (data) => {
        if (data.ticketNumber === String(ticketId)) {
          fetchComments();
        }
      });

      return () => {
        socket.off("ticket:commentsUpdated");
        socket.emit("chat:leaveTicket", ticketId);
      };
    }
  }, [socket, ticketId]);

  const submitComment = async () => {
    if (!body.trim()) return;
    setLoading(true);
    try {
      await commentAPI.add(ticketId, { body: body.trim() });
      setBody("");
      toast.success("Comment added");
      fetchComments();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add comment");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await commentAPI.delete(commentId);
      toast.success("Comment deleted");
      fetchComments();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete comment");
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-bold text-textMain flex items-center gap-2">
        Comments
        <span className="px-2 py-0.5 bg-gray-100 rounded-full text-[10px] text-textMuted font-bold">
          {comments.length}
        </span>
      </h3>

      {/* New comment */}
      <div className="flex gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 shadow-inner">
        <Avatar user={user} size="sm" className="flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <MentionTextarea
            users={users}
            teams={teams}
            onEnter={submitComment}
            className="w-full text-sm border-none focus:ring-0 resize-none bg-transparent p-0"
            placeholder="Add a comment… (Enter to post, Shift+Enter for new line)"
            rows={2}
            value={body}
            onChange={(val) => setBody(val)}
          />
          <div className="flex justify-end mt-2">
            <Button size="sm" loading={loading} onClick={submitComment}>
              Add Comment
            </Button>
          </div>
        </div>
      </div>

      {/* Comment list with separate scroll */}
      <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        <div className="space-y-6">
          {fetching ? (
            <div className="text-xs text-textMuted py-8 text-center animate-pulse">
              Loading comments…
            </div>
          ) : comments.length === 0 ? (
            <div className="text-xs text-textMuted py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
              No comments yet. Be the first!
            </div>
          ) : (
            comments.map((c) => (
              <CommentItem
                key={c.commentId}
                comment={c}
                onReplyAdded={fetchComments}
                onDelete={handleDelete}
                users={users}
                teams={teams}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
