# frozen_string_literal: true

COMMENT_CHARACTER_LIMIT = 240

class RegistrationChecker
  def self.create_registration_allowed!(registration_request, competition_info, requesting_user)
    @request = registration_request
    @competition_info = competition_info
    @requestee_user_id = @request['user_id']
    @requester_user_id = requesting_user.to_s

    user_can_create_registration!
    validate_create_events!
    validate_guests!
    validate_comment!
  end

  def self.update_registration_allowed!(update_request, competition_info, requesting_user)
    @request = update_request
    @competition_info = competition_info
    @requestee_user_id = @request['user_id']
    @requester_user_id = requesting_user.to_s
    @registration = Registration.find("#{update_request['competition_id']}-#{update_request['user_id']}")

    user_can_modify_registration!
    validate_guests!
    validate_comment!
    validate_organizer_fields!
    validate_organizer_comment!
    validate_update_status!
    validate_update_events!
  end

  class << self
    def user_can_create_registration!
      # Only an organizer or the user themselves can create a registration for the user
      raise RegistrationError.new(:unauthorized, ErrorCodes::USER_INSUFFICIENT_PERMISSIONS) unless is_organizer_or_current_user?

      # Only organizers can register when registration is closed, and they can only register for themselves - not for other users
      raise RegistrationError.new(:forbidden, ErrorCodes::REGISTRATION_CLOSED) unless @competition_info.registration_open? || organizer_modifying_own_registration?

      can_compete = UserApi.can_compete?(@request['user_id'])
      raise RegistrationError.new(:unauthorized, ErrorCodes::USER_CANNOT_COMPETE) unless can_compete
    end

    def user_can_modify_registration!
      raise RegistrationError.new(:unauthorized, ErrorCodes::USER_INSUFFICIENT_PERMISSIONS) unless is_organizer_or_current_user?
      raise RegistrationError.new(:forbidden, ErrorCodes::USER_EDITS_NOT_ALLOWED) unless @competition_info.registration_edits_allowed? || @competition_info.is_organizer_or_delegate?(@requester_user_id)
    end

    def organizer_modifying_own_registration?
      @competition_info.is_organizer_or_delegate?(@requester_user_id) && (@requester_user_id == @request['user_id'].to_s)
    end

    def is_organizer_or_current_user?
      # Only an organizer or the user themselves can create a registration for the user
      # One case where organizers need to create registrations for users is if a 3rd-party registration system is being used, and registration data is being
      # passed to the Registration Service from it
      (@requester_user_id == @request['user_id'].to_s) || @competition_info.is_organizer_or_delegate?(@requester_user_id)
    end

    def validate_create_events!
      event_ids = @request['competing']['event_ids']
      # Event submitted must be held at the competition
      raise RegistrationError.new(:unprocessable_entity, ErrorCodes::INVALID_EVENT_SELECTION) unless @competition_info.events_held?(event_ids)
    end

    def validate_guests!
      return unless @request.key?('guests')

      raise RegistrationError.new(:unprocessable_entity, ErrorCodes::INVALID_REQUEST_DATA) if @request['guests'] < 0
      raise RegistrationError.new(:unprocessable_entity, ErrorCodes::GUEST_LIMIT_EXCEEDED) if @competition_info.guest_limit_exceeded?(@request['guests'])
    end

    def validate_comment!
      if @request.key?('competing') && @request['competing'].key?('comment')
        comment = @request['competing']['comment']

        raise RegistrationError.new(:unprocessable_entity, ErrorCodes::USER_COMMENT_TOO_LONG) if comment.length > COMMENT_CHARACTER_LIMIT
        raise RegistrationError.new(:unprocessable_entity, ErrorCodes::REQUIRED_COMMENT_MISSING) if @competition_info.force_comment? && comment == ''
      else
        raise RegistrationError.new(:unprocessable_entity, ErrorCodes::REQUIRED_COMMENT_MISSING) if @competition_info.force_comment?
      end
    end

    def validate_organizer_fields!
      @organizer_fields = ['organizer_comment']

      raise RegistrationError.new(:unauthorized, ErrorCodes::USER_INSUFFICIENT_PERMISSIONS) if contains_organizer_fields? && !@competition_info.is_organizer_or_delegate?(@requester_user_id)
    end

    def validate_organizer_comment!
      if @request.key?('competing') && @request['competing'].key?('organizer_comment')
        organizer_comment = @request['competing']['organizer_comment']

        raise RegistrationError.new(:unprocessable_entity, ErrorCodes::USER_COMMENT_TOO_LONG) if organizer_comment.length > COMMENT_CHARACTER_LIMIT
      end
    end

    def contains_organizer_fields?
      @request.key?('competing') && @request['competing'].keys.any? { |key| @organizer_fields.include?(key) }
    end

    def validate_update_status!
      return unless @request.key?('competing') && @request['competing'].key?('status')

      current_status = @registration.competing_status
      new_status = @request['competing']['status']

      raise RegistrationError.new(:unprocessable_entity, ErrorCodes::INVALID_REQUEST_DATA) unless Registration::REGISTRATION_STATES.include?(new_status)
      raise RegistrationError.new(:forbidden, ErrorCodes::COMPETITOR_LIMIT_REACHED) if
        new_status == 'accepted' && Registration.accepted_competitors(@competition_info.competition_id) >= @competition_info.competitor_limit

      # Organizers can make any status change they want to - no checks performed
      return if @competition_info.is_organizer_or_delegate?(@requester_user_id)

      # A user (ie not an organizer) is only allowed to:
      # 1. Reactivate their registration if they previously cancelled it (ie, change status from 'cancelled' to 'pending')
      # 2. Cancel their registration, assuming they are allowed to cancel

      # User reactivating registration
      if new_status == 'pending'
        raise RegistrationError.new(:unauthorized, ErrorCodes::USER_INSUFFICIENT_PERMISSIONS) unless current_status == 'cancelled'
        return # No further checks needed if status is pending
      end

      # Now that we've checked the 'pending' case, raise an error is the status is not cancelled (cancelling is the only valid action remaining)
      raise RegistrationError.new(:unauthorized, ErrorCodes::USER_INSUFFICIENT_PERMISSIONS) if new_status != 'cancelled'

      # Raise an error if competition prevents users from cancelling a registration once it is accepted
      raise RegistrationError.new(:unauthorized, ErrorCodes::ORGANIZER_MUST_CANCEL_REGISTRATION) if
        !@competition_info.user_can_cancel? && current_status == 'accepted'

      # Users aren't allowed to change events when cancelling
      raise RegistrationError.new(:unprocessable_entity, ErrorCodes::INVALID_REQUEST_DATA) if
        @request['competing'].key?('event_ids') && @registration.event_ids != @request['competing']['event_ids']
    end

    def validate_update_events!
      return unless @request.key?('competing') && @request['competing'].key?('event_ids')
      raise RegistrationError.new(:unprocessable_entity, ErrorCodes::INVALID_EVENT_SELECTION) if !@competition_info.events_held?(
        @request['competing']['event_ids'],
      )
    end
  end
end